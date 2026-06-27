import React from 'react'
import { AiOutlineCheck, AiOutlineShoppingCart, AiOutlineCreditCard, AiOutlineSmile } from 'react-icons/ai'

const CheckoutSteps = ({ active }) => {
  const steps = [
    { id: 1, name: "Shipping", icon: <AiOutlineShoppingCart size={18} /> },
    { id: 2, name: "Payment", icon: <AiOutlineCreditCard size={18} /> },
    { id: 3, name: "Success", icon: <AiOutlineSmile size={18} /> },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg font-semibold
                  transition-all duration-300
                  ${active >= step.id 
                    ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30' 
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {active > step.id ? <AiOutlineCheck size={18} /> : step.icon}
              </div>
              <span
                className={`
                  text-xs mt-2 font-medium transition-colors duration-300
                  ${active >= step.id ? 'text-brand-orange' : 'text-text-secondary'}
                `}
              >
                {step.name}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  flex-1 h-0.5 mx-1 sm:mx-2 transition-all duration-300
                  ${active > step.id ? 'bg-brand-orange' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default CheckoutSteps
