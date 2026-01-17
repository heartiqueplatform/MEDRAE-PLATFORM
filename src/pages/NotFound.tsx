import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  useEffect(() => {
    const container = document.getElementById("heart-zone");

    const createHeart = (x, y) => {
      const heart = document.createElement("div");
      heart.className = "heart";
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      container.appendChild(heart);

      setTimeout(() => {
        heart.remove();
      }, 3000);
    };
    let lastX = 0;
    let lastY = 0;
    const MIN_DISTANCE = 40; // 👈 increase for more space

    const handleMove = (e) => {
      const isButton = e.target.closest("#safe-button");
      if (isButton) return;

      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;

      const distance = Math.hypot(x - lastX, y - lastY);

      if (distance < MIN_DISTANCE) return;

      lastX = x;
      lastY = y;

      createHeart(x, y);
    };


    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
    };
  }, []);

  return (
    <div
      id="heart-zone"
      className="relative min-h-screen w-full bg-black text-white flex items-center justify-center overflow-hidden px-4"
    >
      <div className="text-center max-w-md z-10">
        {/* App Icon */}
        <img
          src="/icon-512.jpg"
          alt="MEDRAE App Icon"
          className="w-20 h-20 mx-auto mb-3 rounded-2xl shadow-lg"
        />
        {/* App Name */}
        <h2 className="text-xl tracking-widest text-gray-300 mb-6">
          MEDRAE
        </h2>
        {/* 404 */}
        <h1 className="text-6xl font-extrabold mb-4">404</h1>
        <p className="text-gray-400 mb-8">
          Care doesn’t stop  even when a page is missing.
        </p>
        {/* Safe Button Zone */}
        <Link
          id="safe-button"
          to="/"
          className="inline-block px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition relative"
        >
          Return Home
        </Link>
      </div>
      {/* Styles */}
      <style>
        {`
          .heart {
            position: absolute;
            width: 14px;
            height: 14px;
            background: #ff4d6d;
            transform: rotate(45deg);
            animation: fall 3s ease-in forwards;
            opacity: 0.8;
          }
          .heart::before,
          .heart::after {
            content: "";
            position: absolute;
            width: 14px;
            height: 14px;
            background: #ff4d6d;
            border-radius: 50%;
          }
          .heart::before {
            top: -7px;
            left: 0;
          }
          .heart::after {
            left: -7px;
            top: 0;
          }
          @keyframes fall {
            0% {
              transform: translateY(0) rotate(45deg);
              opacity: 0.9;
            }
            100% {
              transform: translateY(120px) rotate(45deg);
              opacity: 0;
            }
          }
        `}
      </style>
    </div>
  );
};
export default NotFound;
