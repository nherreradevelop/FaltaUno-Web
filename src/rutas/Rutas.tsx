import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { DetalleActividadPage } from '../paginas/DetalleActividadPage';
import { ExplorarPage } from '../paginas/ExplorarPage';
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
          {/* CU08: la búsqueda de actividades es la pantalla principal con sesión */}
          <Route path="/" element={<ExplorarPage />} />
          {/* CU04 FP y A1 */}
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/usuarios/:id" element={<PerfilPage />} />
          {/* CU09: el detalle incluye participantes (A1) y mapa (A2) */}
          <Route path="/actividades/:id" element={<DetalleActividadPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
