import { Drawer } from "antd"
import cssText from "data-text:~/contents/main.css"
import { useEffect, useState } from "react"

import Deploy from "../components/deploy"
import ResetStyles from "../components/reset-styles"

import "./main.css"

// // Inject into the ShadowDOM
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

// export const getShadowHostId = () => "plasmo-main-sidebar"

export default function Main() {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <>
      {!isOpen && (
        <button id="open-button" onClick={() => setIsOpen(true)}>
          open
        </button>
      )}
      <Drawer
        title="工具箱"
        closable={{ 'aria-label': 'Close Button' }}
        size="large"
        onClose={() => setIsOpen(false)}
        open={isOpen}
      >
        <div id="main">
          xxxx
          <ResetStyles />
          <Deploy />
        </div>
      </Drawer>
    </>
  )

  // return (
  //   <div id="main" className={isOpen ? "open" : "closed"}>
  //     <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
  //       {isOpen ? "🟡 Close" : "🟣 Open"}
  //     </button>
  //     {/* <img src={iconBase64} alt="Extension Icon" width={128} height={128} /> */}
  //     <p>The Easiest Way to Build, Test, and Ship browser extensions</p>
  //     样式展示xxxright
  //     <Deploy />
  //     <ResetStyles />
  //   </div>
  // )
}
