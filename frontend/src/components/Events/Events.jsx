import React, { useState } from "react";
import { useSelector } from "react-redux";
import EventCard from "./EventCard";
import { AiOutlineCalendar } from "react-icons/ai";

const Events = () => {
  const { allEvents, isLoading } = useSelector((state) => state.events);
  const [visibleCount, setVisibleCount] = useState(4);

  const loadMore = () => {
    setVisibleCount(prev => prev + 4);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Section Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-sm font-semibold mb-3 animate-fadeInUp">
          <AiOutlineCalendar size={14} />
          <span>HOT EVENTS</span>
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3 animate-fadeInUp">
          Popular <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-orange-hover">Events</span>
        </h2>
        <p className="text-text-secondary max-w-2xl mx-auto animate-fadeInUp">
          Don't miss out on our special events and exclusive offers
        </p>
      </div>

      {!isLoading ? (
        <>
          {allEvents && allEvents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allEvents.slice(0, visibleCount).map((event, index) => (
                  <div
                    key={event._id || index}
                    className="animate-fadeInUp"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <EventCard data={event} />
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {allEvents.length > visibleCount && (
                <div className="text-center mt-10">
                  <button
                    onClick={loadMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white rounded-lg font-medium transition-all duration-300 hover:scale-105"
                  >
                    Load More Events
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          ) : (
            // Empty State
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <AiOutlineCalendar size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">No Active Events</h3>
              <p className="text-text-secondary">Check back soon for exciting offers and events!</p>
            </div>
          )}
        </>
      ) : (
        // Loading Skeletons
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-96 animate-pulse"></div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events;