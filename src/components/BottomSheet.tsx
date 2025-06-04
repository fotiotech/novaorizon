import React, { useState } from "react";
import { useSpring, animated } from "react-spring";
import { useDrag } from "react-use-gesture";

// Define the BottomSheet component
const BottomSheet = ({
  open,
  setOpen,
}: {
  open?: boolean;
  setOpen: (arg: boolean) => void;
}) => {
  // Set up animation with react-spring
  const [{ y }, api] = useSpring(() => ({ y: 100 }));

  // Handle dragging gesture using react-use-gesture
  const bind = useDrag(
    ({ last, movement: [, my], memo = y.get() }) => {
      if (last) {
        // Snap to closed if dragged past halfway, otherwise snap to open
        setOpen(my > 50 ? false : true);
        api.start({ y: my > 50 ? 100 : 0 });
      } else {
        // Update the position during dragging
        api.start({ y: memo + my });
      }
      return memo;
    },
    { from: () => [0, y.get()] }
  );

  // Open and close the sheet
  const toggleSheet = () => {
    setOpen(!open);
    api.start({ y: open ? 100 : 0 });
  };

  return (
    <>
      {/* Trigger button to open the sheet */}
      <button
        onClick={toggleSheet}
        className="fixed bottom-0 left-0 m-4 p-2 bg-blue-500 text-white rounded"
      >
        Toggle Bottom Sheet
      </button>

      {/* Animated Bottom Sheet */}
      <animated.div
        {...bind()}
        className="fixed bottom-0 left-0 right-0 bg-white shadow-lg rounded-t-xl touch-none"
        style={{
          y,
          transform: y.to((y) => `translateY(${y}%)`),
          height: "60vh", // Set height of bottom sheet
        }}
      >
        {/* Content of the Bottom Sheet */}
        <div className="p-4">
          <h2 className="text-lg font-semibold">Bottom Sheet Content</h2>
          <p>Place your content here...</p>
        </div>
      </animated.div>
    </>
  );
};

export default BottomSheet;
