import { useEffect, useState } from "react";
import { isOnMessagesPage } from "../utils/nav";

export function useIsMessagesPage(): boolean {
  const [onPage, setOnPage] = useState(isOnMessagesPage);

  useEffect(() => {
    const check = () => setOnPage(isOnMessagesPage());
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("popstate", check);
    window.addEventListener("influnet-nav-changed", check);
    const poll = window.setInterval(check, 1500);
    return () => {
      obs.disconnect();
      window.removeEventListener("popstate", check);
      window.removeEventListener("influnet-nav-changed", check);
      clearInterval(poll);
    };
  }, []);

  return onPage;
}
