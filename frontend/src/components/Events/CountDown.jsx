import React, { useEffect, useState } from "react";

const calculateTimeLeft = (finishDate) => {
  if (!finishDate) return {};

  const difference = new Date(finishDate).getTime() - Date.now();

  if (difference <= 0) return {};

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

const CountDown = ({ data }) => {
  const finishDate = data?.Finish_Date;
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(finishDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(finishDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [finishDate]);

  const isExpired = Object.keys(timeLeft).length === 0;

  return (
    <div>
      {!isExpired ? (
        Object.keys(timeLeft).map((interval) => (
          <span key={interval} className="text-[25px] text-[#475ad2]">
            {timeLeft[interval]} {interval}{" "}
          </span>
        ))
      ) : (
        <span className="text-[red] text-[25px]">Time's Up</span>
      )}
    </div>
  );
};

export default CountDown;
