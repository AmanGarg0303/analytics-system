import { useEffect, useState } from "react";
import "./App.css";

type CountButtons = {
  signup: number;
  login: number;
};

function App() {
  const [counts, setCounts] = useState<CountButtons>({
    signup: 0,
    login: 0,
  });

  const fetchClicksCount = async () => {
    fetch("http://localhost:8000/api/buttonClicks")
      .then(async (data) => {
        return await data.json();
      })
      .then((data) => {
        setCounts(data);
      })
      .catch((err) => {
        console.log("Err:", err);
      });
  };

  const trackClicks = async (btnName: string) => {
    const body = JSON.stringify({ btnName });
    const blob = new Blob([body], {
      type: "application/json",
    });
    navigator.sendBeacon("http://localhost:8000/api/trackClicks", blob);
    await new Promise((res) => setTimeout(res, 10));
    fetchClicksCount();
  };

  useEffect(() => {
    fetchClicksCount();
  }, []);

  return (
    <>
      <div className="flex flex-col gap-y-8 justify-center items-center bg-blue-200 min-h-screen min-w-screen">
        <button onClick={() => trackClicks("signup")} className="btn-primary">
          Signup Button Click Count {counts.signup}
        </button>
        <button onClick={() => trackClicks("login")} className="btn-primary">
          Login Button Click Count {counts.login}
        </button>
      </div>
    </>
  );
}

export default App;
