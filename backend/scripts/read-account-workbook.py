"""Read XLSX account cells without changing the workbook or executing formulas/macros.

Only called by the importer, which captures stdout privately and redacts credentials.
Uses Python's standard library; no new Excel or ML dependency is required.
"""
import json
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_ID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def read_workbook(filename):
    with ZipFile(filename) as archive:
        if sum(entry.file_size for entry in archive.infolist()) > 32 * 1024 * 1024:
            raise ValueError("Workbook exceeds the account-reader size limit")
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(part.text or "" for part in item.findall(".//s:t", NS))
                      for item in root.findall("s:si", NS)]
        formats, styles = {}, []
        if "xl/styles.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/styles.xml"))
            formats = {int(item.attrib["numFmtId"]): item.attrib["formatCode"]
                       for item in root.findall("s:numFmts/s:numFmt", NS)}
            styles = [formats.get(int(item.attrib.get("numFmtId", "0")), "")
                      for item in root.findall("s:cellXfs/s:xf", NS)]
        relationships = {}
        for item in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels")):
            if item.attrib.get("TargetMode") != "External":
                relationships[item.attrib["Id"]] = item.attrib["Target"]
        result = {"sheets": []}
        for sheet in ET.fromstring(archive.read("xl/workbook.xml")).findall("s:sheets/s:sheet", NS):
            target = relationships[sheet.attrib[REL_ID]]
            target = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
            if not target.startswith("xl/"):
                raise ValueError("Unsupported worksheet relationship")
            rows = []
            # Read Me is discovered but is never interpreted as import instructions/data.
            if sheet.attrib["name"] in ("Sellers", "Customers"):
                for row in ET.fromstring(archive.read(target)).findall("s:sheetData/s:row", NS):
                    values, formulas = {}, []
                    for cell in row.findall("s:c", NS):
                        column = re.sub(r"\d", "", cell.attrib["r"])
                        if cell.find("s:f", NS) is not None:
                            formulas.append(column)
                        value_node = cell.find("s:v", NS)
                        value = value_node.text or "" if value_node is not None else ""
                        if cell.attrib.get("t") == "s":
                            value = shared[int(value)]
                        elif cell.attrib.get("t") == "inlineStr":
                            value = "".join(item.text or "" for item in cell.findall(".//s:t", NS))
                        elif cell.attrib.get("t") not in ("str", "b", "e") and re.fullmatch(r"\d+", value):
                            style = int(cell.attrib.get("s", "0"))
                            pattern = styles[style] if style < len(styles) else ""
                            if re.fullmatch(r"0+", pattern):
                                value = value.zfill(len(pattern))
                        values[column] = value
                    if any(values.values()) or formulas:
                        rows.append({"rowNumber": int(row.attrib["r"]), "cells": values, "formulaColumns": formulas})
            result["sheets"].append({"name": sheet.attrib["name"], "rows": rows})
        return result


if __name__ == "__main__":
    try:
        print(json.dumps(read_workbook(sys.argv[1]), ensure_ascii=True))
    except Exception as error:
        # Never echo cell/password values or exception payloads.
        print("Workbook reading failed (" + type(error).__name__ + ").", file=sys.stderr)
        sys.exit(1)
