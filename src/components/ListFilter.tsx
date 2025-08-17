import React, { useEffect, useState } from "react";
import useClickOusite, { useScreenSize } from "./Hooks";

interface Filter {
  id: string;
  name: string;
  count: number;
}

type FilterListProps = {
  openClose: boolean;
  setOpenClose: React.Dispatch<React.SetStateAction<boolean>>;
  filters: {
    categories: { id: string; name: string; count: number }[];
    brands: { id: string; name: string; count: number }[];
    priceRange: { min: number; max: number };
  };
  handleFilterClick: (key: string, value: string) => void;
};

const ListFilter = ({
  openClose,
  setOpenClose,
  filters,
  handleFilterClick,
}: FilterListProps) => {
  const [screenSize, setScreenSize] = useState(0);

  useEffect(() => {
    if (openClose) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [openClose]);

  useScreenSize(() => {
    setScreenSize(window.innerWidth);
  });

  const domNode = useClickOusite(() => setOpenClose(false));

  return (
    <div
      ref={domNode}
      className={`${
        screenSize <= 1024
          ? openClose
            ? "absolute z-10 bottom-0 top-20"
            : "hidden"
          : ""
      } w-full lg:w-60 h-full rounded-t-xl lg:rounded-none bg-pri p-2 pb-8 border-thi lg:border-none border-4 transition-all`}
    >
      <div>
        <h3 className="font-semibold text-lg">Filter List</h3>
      </div>
      {filters && (
        <div className="h-96 overflow-y-auto">
          {/* Categories */}
          <div>
            <h3 className="font-bold text-lg">Categories:</h3>
            <ul className="pl-5 font-medium list-disc">
              {filters.categories?.map((category) => (
                <li
                  key={category.id}
                  onClick={() => handleFilterClick("category", category.id)}
                  className="cursor-pointer hover:underline"
                >
                  {category.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Brands */}
          <div>
            <h3 className="font-bold text-lg mt-4">Brands:</h3>
            <ul className="pl-5 font-medium list-disc">
              {filters.brands?.map((brand) => (
                <li
                  key={brand.id}
                  onClick={() => handleFilterClick("brand", brand.id)}
                  className="cursor-pointer hover:underline"
                >
                  {brand.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Price Range */}
          <h3 className="font-bold text-lg mt-4">Price Range:</h3>
          <div>
            <span>Min: {filters?.priceRange?.min}</span> -{" "}
            <span>Max: {filters?.priceRange?.max}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListFilter;
