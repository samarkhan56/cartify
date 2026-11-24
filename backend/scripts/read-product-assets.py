"""Read the approved product sheet and validate numbered source images, without editing them.

Manual importer dependency: Pillow in CARTIFY_PRODUCT_PYTHON (not the ML runtime).
Workbook cells are data only; formulas, external links and other sheets are never executed.
"""
import hashlib
import json
from pathlib import Path
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile


def read_rows(filename):
    ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with ZipFile(filename) as archive:
        if sum(info.file_size for info in archive.infolist()) > 32 * 1024 * 1024:
            raise ValueError("Workbook exceeds the 32 MiB reader limit")
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared = ["".join(t.text or "" for t in item.findall(".//s:t", ns))
                      for item in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("s:si", ns)]
        rels = {r.attrib["Id"]: r.attrib["Target"]
                for r in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
                if r.attrib.get("TargetMode") != "External"}
        sheets = ET.fromstring(archive.read("xl/workbook.xml")).findall("s:sheets/s:sheet", ns)
        sheets = [s for s in sheets if s.attrib["name"] == "Product Allocation"]
        if len(sheets) != 1:
            raise ValueError("Exactly one Product Allocation sheet is required")
        target = rels[sheets[0].attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]]
        target = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
        if not target.startswith("xl/"):
            raise ValueError("Invalid worksheet relationship")
        rows = []
        for row in ET.fromstring(archive.read(target)).findall("s:sheetData/s:row", ns):
            cells = {}
            for cell in row.findall("s:c", ns):
                if cell.find("s:f", ns) is not None:
                    raise ValueError("Formulas are not accepted in Product Allocation")
                column = re.sub(r"\d", "", cell.attrib["r"])
                value = cell.find("s:v", ns)
                value = value.text or "" if value is not None else ""
                if cell.attrib.get("t") == "s":
                    value = shared[int(value)]
                elif cell.attrib.get("t") == "inlineStr":
                    value = "".join(t.text or "" for t in cell.findall(".//s:t", ns))
                cells[column] = value
            if any(cells.values()):
                rows.append(cells)
        return rows


def inspect_assets(workbook, images):
    from PIL import Image
    root = Path(images).resolve(strict=True)
    folders = [p for p in root.iterdir() if p.is_dir()]
    if len(folders) != 32:
        raise ValueError("Exactly 32 product folders are required")
    checked = []
    for number in range(1, 33):
        matches = [p for p in folders if re.match(rf"^{number:02d}\s", p.name)]
        if len(matches) != 1:
            raise ValueError(f"Product #{number:02d}: missing or ambiguous numbered folder")
        folder = matches[0]
        files = [p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
        preferred = [p for p in files if p.stem == "01"]
        if len(preferred) != 1:
            raise ValueError(f"Product #{number:02d}: exactly one 01 image is required in {folder.name}")
        file = preferred[0]
        if not file.resolve().is_relative_to(root) or not 0 < file.stat().st_size <= 20 * 1024 * 1024:
            raise ValueError(f"Product #{number:02d}: invalid image path or size ({file.name})")
        try:
            with Image.open(file) as im:
                fmt, size = im.format, im.size
                if fmt not in ("JPEG", "PNG", "WEBP") or min(size) < 100 or max(size) > 16000:
                    raise ValueError("Unsupported signature or dimensions")
                im.verify()
            with Image.open(file) as im:
                im.load()
        except Exception as error:
            raise ValueError(f"Product #{number:02d}: invalid image {folder.name}/{file.name} ({type(error).__name__})") from None
        checked.append({"number": number, "relativePath": str(file.relative_to(root)), "format": fmt,
                        "bytes": file.stat().st_size, "width": size[0], "height": size[1],
                        "sha256": hashlib.sha256(file.read_bytes()).hexdigest()})
    return {"rows": read_rows(workbook), "images": checked,
            "workbookSha256": hashlib.sha256(Path(workbook).read_bytes()).hexdigest()}


if __name__ == "__main__":
    try:
        print(json.dumps(inspect_assets(sys.argv[1], sys.argv[2])))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
