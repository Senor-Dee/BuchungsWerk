// ContainerScroll — Aceternity UI port, adapted for Gusswerk Dark Glass design system
// No Tailwind — inline styles only. framer-motion required.
import React, { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export const ContainerScroll = ({ titleComponent, children }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const rotate    = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale     = useTransform(scrollYProgress, [0, 1], isMobile ? [0.7, 0.9] : [1.05, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      ref={containerRef}
      style={{
        height:          isMobile ? "60rem" : "80rem",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        position:        "relative",
        padding:         isMobile ? "8px" : "80px",
      }}
    >
      <div style={{ paddingTop: isMobile ? "40px" : "160px", paddingBottom: isMobile ? "40px" : "160px",
        width: "100%", position: "relative", perspective: "1000px" }}>
        <ScrollHeader translate={translate} titleComponent={titleComponent} />
        <ScrollCard rotate={rotate} translate={translate} scale={scale} isMobile={isMobile}>
          {children}
        </ScrollCard>
      </div>
    </div>
  );
};

const ScrollHeader = ({ translate, titleComponent }) => (
  <motion.div
    style={{ translateY: translate, maxWidth: "56rem", margin: "0 auto", textAlign: "center" }}
  >
    {titleComponent}
  </motion.div>
);

const ScrollCard = ({ rotate, scale, children, isMobile }) => (
  <motion.div
    style={{
      rotateX:       rotate,
      scale,
      boxShadow:     "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      marginTop:     "-48px",
      marginLeft:    "auto",
      marginRight:   "auto",
      maxWidth:      "72rem",
      height:        isMobile ? "28rem" : "42rem",
      width:         "100%",
      border:        "1px solid rgba(232,96,10,0.28)",
      padding:       isMobile ? "6px" : "8px",
      background:    "linear-gradient(135deg,#1e150c 0%,#140e08 100%)",
      borderRadius:  "24px",
    }}
  >
    {/* Window chrome bar */}
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px 8px",
      borderBottom:"1px solid rgba(240,236,227,0.06)" }}>
      {["#e8600a","rgba(240,236,227,0.25)","rgba(240,236,227,0.12)"].map((c,i) => (
        <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:c }} />
      ))}
      <div style={{ flex:1, textAlign:"center", fontSize:10, fontFamily:"'IBM Plex Sans',sans-serif",
        color:"rgba(240,236,227,0.22)", letterSpacing:"0.12em", textTransform:"uppercase",
        marginRight:30 }}>BuchungsWerk</div>
    </div>
    {/* Content */}
    <div style={{ height: "calc(100% - 33px)", width:"100%", overflow:"hidden",
      borderRadius:"0 0 16px 16px", background:"#110d07" }}>
      {children}
    </div>
  </motion.div>
);
