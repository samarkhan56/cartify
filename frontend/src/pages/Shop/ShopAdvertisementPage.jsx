import React from "react";
import DashboardHeader from "../../components/Shop/Layout/DashboardHeader";
import DashboardSideBar from "../../components/Shop/Layout/DashboardSideBar";
import AdvertisementRecommendations from "../../components/Shop/AdvertisementRecommendations";

export default function ShopAdvertisementPage() {
  return <div>
    <DashboardHeader />
    <div className="flex items-start justify-between w-full">
      <div className="w-[80px] 800px:w-[330px] shrink-0"><DashboardSideBar active={12} /></div>
      <AdvertisementRecommendations />
    </div>
  </div>;
}
