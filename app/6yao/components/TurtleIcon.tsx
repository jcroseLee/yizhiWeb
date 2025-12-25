
export const TurtleIcon = ({ className = "w-12 h-12", color = "#C82E31" }) => (
//   <svg 
//     className={className} 
//     viewBox="0 0 48 48" 
//     fill="none" 
//     xmlns="http://www.w3.org/2000/svg"
//   >
//     <path d="M8 32C8 32 12 14 24 14C36 14 40 32 40 32" stroke={color} strokeWidth="2" stroke-linecap="round"/>
//     <path d="M8 32C12 36 36 36 40 32" stroke={color} stroke-width="2" stroke-linecap="round"/>
//     <path d="M24 14V22" stroke={color} stroke-width="2" stroke-linecap="round"/>
//     <path d="M16 20L18 26" stroke={color} stroke-width="2" stroke-linecap="round"/>
//     <path d="M32 20L30 26" stroke={color} stroke-width="2" stroke-linecap="round"/>
//     <circle cx="36" cy="12" r="3" stroke={color} stroke-width="1.5"/>
//     <rect x="35" y="11" width="2" height="2" fill={color}/>
//  </svg>

 <svg 
    className={className} 
    viewBox="0 0 48 48" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
  <path d="M24 6C12.9543 6 4 14.9543 4 26C4 37.0457 12.9543 44 24 44C35.0457 44 44 37.0457 44 26C44 14.9543 35.0457 6 24 6Z" stroke="#C82E31" strokeWidth="1.5" strokeLinejoin="round"/>
  <path d="M24 6V15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M24 37V44" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M4 26L12 26" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M36 26L44 26" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M12 26L18 15L30 15L36 26L30 37L18 37L12 26Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
  <path d="M18 15L8 10" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M30 15L40 10" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M30 37L40 42" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M18 37L8 42" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
</svg>
);


