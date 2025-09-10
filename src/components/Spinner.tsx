import React, { FC } from "react";
import { MoonLoader } from "react-spinners";

interface SpinnerProps {
  size?: number;
  color?: string;
  speedMultiplier?: number;
  className?: string;
  fullScreen?: boolean;
  text?: string;
  overlay?: boolean;
}

const Spinner: FC<SpinnerProps> = ({
  size = 28,
  color = "#5C83F7",
  speedMultiplier = 0.4,
  className = "",
  fullScreen = false,
  text = "",
  overlay = false,
}) => {
  const spinnerContent = (
    <div
      className={`flex flex-col justify-center items-center text-center ${className}`}
    >
      <MoonLoader color={color} speedMultiplier={speedMultiplier} size={size} />
      {text && (
        <p className="mt-3 text-sm font-medium text-gray-600" style={{ color }}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex justify-center items-center bg-white bg-opacity-80">
        {spinnerContent}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex justify-center items-center bg-white bg-opacity-70 rounded-lg">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default Spinner;
