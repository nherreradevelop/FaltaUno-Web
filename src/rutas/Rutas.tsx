import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { InicioPage } from '../paginas/InicioPage';
import { LoginPage } from '../paginas/LoginPage';
import { RutaPrivada, RutaSoloSinSesion } from './RutaPrivada';

export function Rutas() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <RutaSoloSinSesion>
              <LoginPage />
            </RutaSoloSinSesion>
          }
        />
        <Route
          path="/"
          element={
            <RutaPrivada>
              <InicioPage />
            </RutaPrivada>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
