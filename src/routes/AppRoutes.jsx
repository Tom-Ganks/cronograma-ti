import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/login/LoginPage';
import HomePage from '../pages/home/HomePage';
import RegisterUserPage from '../pages/register/RegisterUserPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterUserPage />} />
      <Route path="/home" element={<HomePage />} />
    </Routes>
  );
}
