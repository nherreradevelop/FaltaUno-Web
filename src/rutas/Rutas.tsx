import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { InicioPage } from '../paginas/InicioPage';
import { LoginPage } from '../paginas/LoginPage';
import { PerfilPage } from '../paginas/PerfilPage';
import { DisenoPrivado } from './DisenoPrivado';
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
          element={
            <RutaPrivada>
              <DisenoPrivado />
            </RutaPrivada>
          }
        >
          <Route path="/" element={<InicioPage />} />
          {/* CU04 FP y A1 */}
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/usuarios/:id" element={<PerfilPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
