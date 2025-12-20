import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    if (window.__used) return;
    window.__used = true;

    const code = new URLSearchParams(window.location.search).get("code");

    if (!code) {
      console.error("No authorization code");
      return;
    }

    const exchange = async () => {
      try {
        const resp = await fetch("https://localhost:4000/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", 
          body: JSON.stringify({ code }),
        });

        const result = await resp.json();
        console.log("Auth result:", result);

        if (!resp.ok) {
          console.error(result);
          return;
        }

        const role = result.data.user.role;

        if (role === "staff") {
          navigate("/userDashboard", { replace: true });
        } else if (role === "admin") {
          navigate("/adminDashboard", { replace: true });
        } else {
          navigate("/NormalUserDashboard", { replace: true });
        }

      } catch (err) {
        console.error("Token exchange failed", err);
      }
    };

    exchange();
  }, [navigate]);

  return <h2>Completing login...</h2>;
}
