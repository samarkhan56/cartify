import React from "react";
import styles from "../../styles/styles";
import ShopInfo from "../../components/Shop/ShopInfo";
import ShopProfileData from "../../components/Shop/ShopProfileData";

const ShopHomePage = () => {
  return (
    <div className={`${styles.section} bg-[#f5f5f5] min-h-screen`}>
      <div className="w-full 800px:flex py-10 justify-between gap-6">
        <div className="800px:w-[28%] bg-[#fff] rounded-lg shadow-sm 800px:overflow-y-auto 800px:max-h-[90vh] 800px:sticky top-10 left-0 z-10">
          <ShopInfo isOwner={true} />
        </div>
        <div className="800px:w-[70%] mt-5 800px:mt-0 rounded-lg">
          <ShopProfileData isOwner={true} />
        </div>
      </div>
    </div>
  );
};

export default ShopHomePage;
