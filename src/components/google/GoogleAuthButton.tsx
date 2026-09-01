import { useState } from "react";
import GoogleRoleModal from "./GoogleRoleModal";

export default function GoogleAuthButton() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="
          w-full
          h-12
          rounded-2xl
          border
          border-slate-200
          bg-white
          hover:bg-slate-50
          transition-all
          flex
          items-center
          justify-center
          gap-3
          font-bold
          text-slate-700
          shadow-sm
          hover:shadow-md
          active:scale-[0.99]
        "
            >
                <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="w-5 h-5"
                />

                Continue with Google
            </button>

            <GoogleRoleModal
                open={open}
                onClose={() => setOpen(false)}
            />
        </>
    );
}