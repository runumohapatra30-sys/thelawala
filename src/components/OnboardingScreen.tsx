import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const onboardingData = [
  {
    title: "Easily track your package",
    description: "Getting location updates from our couriers",
    image: "https://images.unsplash.com/photo-1526367460882-16d1241af130?w=500&auto=format&fit=crop&q=60",
  },
  {
    title: "Fast delivery in your area",
    description: "Your package will come right to your door as soon as possible",
    image: "https://images.unsplash.com/photo-1617347454431-f49d7ff5c3b1?w=500&auto=format&fit=crop&q=60",
  },
  {
    title: "Delivering your package carefully",
    description: "We care about your package as you do",
    image: "https://images.unsplash.com/photo-1586880244406-556ebe37a282?w=500&auto=format&fit=crop&q=60",
  },
];

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="flex flex-col justify-between items-center min-h-screen bg-white p-6 max-w-md mx-auto">
      <div className="w-full flex justify-end pt-4">
        <button onClick={() => navigate('/home')} className="text-gray-400 text-sm font-medium">
          Skip
        </button>
      </div>

      <div className="flex flex-col items-center text-center my-auto">
        <div className="w-72 h-72 mb-8 flex items-center justify-center">
          <img 
            src={onboardingData[currentIndex].image} 
            alt="Onboarding" 
            className="max-h-full object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {onboardingData[currentIndex].title}
        </h2>
        <p className="text-gray-500 text-sm px-4">
          {onboardingData[currentIndex].description}
        </p>
      </div>

      <div className="w-full pb-8">
        <div className="flex justify-center space-x-2 mb-6">
          {onboardingData.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === index ? 'w-6 bg-orange-500' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 rounded-xl shadow-lg transition-all"
        >
          {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
