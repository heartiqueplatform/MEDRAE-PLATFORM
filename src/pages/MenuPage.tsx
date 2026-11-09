// src/pages/MenuPage.tsx
// The /menu route exists only so swipe + footer can navigate to it.
// But the drawer itself stays an OVERLAY — full-screen, slides over
// everything, exactly like before. We just drive it from the URL
// instead of from local state.

import { MobileDrawer } from "@/components/MobileDrawer";
import { useNavigate } from "react-router-dom";

export default function MenuPage() {
    const navigate = useNavigate();

    return (
        <MobileDrawer
            isOpen={true}
            setIsOpen={(open) => {
                // Closing the drawer = go back to the previous tab.
                if (!open) navigate(-1);
            }}
        />
    );
}