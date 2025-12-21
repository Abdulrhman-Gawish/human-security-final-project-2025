import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Homepage from "./pages/HomePage";
import Login from "./pages/LoginPage";
import Signup from "./pages/SignupPage";
import Setup2FA from "./pages/setup2FA";
import OTPVerification from "./pages/OTPVerification";
import UserDashboard from "./pages/userDashboard";
import NormalUserDashboard from "./pages/NormalUserDashboard";
import AdminDashboard from "./pages/adminDashboard";
import Callback from "./pages/Callback";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/setup-2fa" element={<Setup2FA />} />
        <Route path="/verify-2fa" element={<OTPVerification />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/userDashboard" element={<UserDashboard />} />
        <Route path="/NormalUserDashboard" element={<NormalUserDashboard />} />
        <Route path="/adminDashboard" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
