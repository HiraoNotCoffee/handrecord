import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import HandEditor from './pages/HandEditor';
import Players from './pages/Players';
import Settings from './pages/Settings';

function App() {
  return (
    <div className="min-h-full">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hand/:id" element={<HandEditor />} />
        <Route path="/players" element={<Players />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
}

export default App;
