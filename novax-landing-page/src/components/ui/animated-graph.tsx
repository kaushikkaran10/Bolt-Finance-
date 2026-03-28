import { useEffect, useState, useRef } from "react";

export function AnimatedGraph() {
  const [dataPoints, setDataPoints] = useState<number[]>(() => {
    const points = [40]; // Starting point relative to height
    let current = 40;
    for (let i = 1; i < 50; i++) {
        const change = (Math.random() - 0.45) * 15;
        current = Math.max(10, Math.min(90, current + change));
        
        if (i === 25) current += 25;
        if (i === 35) current -= 15;
        
        points.push(current);
    }
    return points;
  });
  const svgRef = useRef<SVGSVGElement>(null);

  // Animate the live ticking data
  useEffect(() => {
    const interval = setInterval(() => {
      setDataPoints(prev => {
        const newPoints = [...prev.slice(1)];
        const last = newPoints[newPoints.length - 1];
        const change = (Math.random() - 0.48) * 5; // Slight upward bias
        newPoints.push(Math.max(5, Math.min(95, last + change)));
        return newPoints;
      });
    }, 2000); // New tick every 2 seconds

    return () => clearInterval(interval);
  }, []);

  if (dataPoints.length === 0) return null;

  // Render SVG Path Data
  const width = 800; // SVG viewBox width
  const height = 300; // SVG viewBox height
  const xStep = width / (dataPoints.length - 1);
  
  // Create the main line path
  const linePathD = dataPoints.reduce((acc, point, index) => {
    const x = index * xStep;
    // Map data points (0-100) to SVG height (0-height), inverted because 0 is at the top
    const y = height - (point / 100) * height;
    
    if (index === 0) return `M ${x} ${y}`;
    
    // Create a smooth cubic bezier curve
    const prevX = (index - 1) * xStep;
    const prevY = height - (dataPoints[index - 1] / 100) * height;
    
    // Control points for smooth curves (using 1/3 of the distance)
    const cpX1 = prevX + (x - prevX) / 3;
    const cpX2 = x - (x - prevX) / 3;
    
    return `${acc} C ${cpX1} ${prevY}, ${cpX2} ${y}, ${x} ${y}`;
  }, "");

  // Create the filled area path below the line
  const areaPathD = `${linePathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className="relative w-full max-w-4xl mx-auto mt-16 mb-8 group glass-panel rounded-3xl p-6 md:p-10 border border-white/5 overflow-hidden">
      
      {/* Background Ambient Glow matching the graph color */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-brand/10 blur-[80px] -z-10 rounded-[100%]" />
      
      {/* Financial Info Header overlay */}
      <div className="flex justify-between items-start mb-6 z-10 relative">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">
             <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
             Live Network Liquidity
          </div>
          <div className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
            $24,059,210
          </div>
        </div>
        <div className="text-right">
          <div className="text-brand font-bold text-xl md:text-2xl flex items-center gap-1 justify-end">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
             +12.4%
          </div>
          <div className="text-xs text-gray-500 font-mono mt-1">Past 24 Hours</div>
        </div>
      </div>

      {/* The SVG Graph container */}
      <div className="relative w-full aspect-[2.5/1] md:aspect-[3/1]">
        
        {/* Soft Grid Lines (Background) */}
        <div className="absolute inset-0 flex flex-col justify-between select-none pointer-events-none opacity-20 z-0">
           <div className="w-full h-[1px] bg-white/10" />
           <div className="w-full h-[1px] bg-white/10" />
           <div className="w-full h-[1px] bg-white/10" />
           <div className="w-full border-b border-dashed border-white/20" /> {/* Bottom axis line */}
        </div>

        <svg 
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-full relative z-10 overflow-visible"
            preserveAspectRatio="none"
        >
            <defs>
                {/* 1. Glow Filter for the Line */}
                <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                
                {/* 2. Gradient for the Area under the line */}
                <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(0, 255, 136, 0.4)" />
                    <stop offset="50%" stopColor="rgba(0, 255, 136, 0.1)" />
                    <stop offset="100%" stopColor="rgba(0, 255, 136, 0)" />
                </linearGradient>

                 {/* 3. Gradient for the Line itself (to fade out at the edges) */}
                 <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(0, 255, 136, 0)" />
                    <stop offset="10%" stopColor="rgba(0, 255, 136, 1)" />
                    <stop offset="90%" stopColor="rgba(0, 255, 136, 1)" />
                    <stop offset="100%" stopColor="rgba(0, 255, 136, 0.2)" />
                </linearGradient>
            </defs>

            {/* Filled Area with Gradient */}
            <path 
               d={areaPathD} 
               fill="url(#area-gradient)" 
               className="transition-all duration-1000 ease-linear"
            />
            
            {/* The Actual Neon Line */}
            <path 
               d={linePathD} 
               fill="none" 
               stroke="url(#line-gradient)" 
               strokeWidth="4" 
               strokeLinecap="round"
               strokeLinejoin="round"
               className="transition-all duration-1000 ease-linear"
               style={{ filter: "url(#neon-glow)" }}
            />
        </svg>

        {/* X-Axis Labels */}
        <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-gray-500 font-mono select-none">
            <span>9:00 AM</span>
            <span>12:00 PM</span>
            <span>3:00 PM</span>
            <span>Live</span>
        </div>
      </div>
    </div>
  );
}
