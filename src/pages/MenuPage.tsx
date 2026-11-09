import { MobileDrawer } from "@/components/MobileDrawer";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

export default function MenuPage() {
    const navigate = useNavigate();
    const skipBack = useRef(false);

    return (
        <MobileDrawer
            isOpen={true}
            setIsOpen={(open) => {
                if (open) return;
                if (skipBack.current) {
                    // Drawer already navigated to a real route — don't go back.
                    skipBack.current = false;
                    return;
                }
                navigate(-1);
            }}
            // 👇 new prop so the drawer tells MenuPage "I handled nav myself"
            onInternalNavigate={() => { skipBack.current = true; }}
        />
    );
}