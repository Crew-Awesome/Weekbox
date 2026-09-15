import React from "react";
import Components from "@components";

export const HomeBanner: React.FC = () => {
  return (
    <Components.molecules.Banner
      pillTitle="Popular Community Pick"
      title="SCP: Project Funkin'"
      author="by N1CEDEV"
      timeText="4d"
      likesCount={66}
      viewsCount="2,314"
      thumbnail="/assets/images/placeholder-mini.jpg"
      icon="/assets/icons/categories/codename.png"
      className="mt-8 mb-8"
      onClick={() => console.log("Banner clicked!")}
    />
  );
};
