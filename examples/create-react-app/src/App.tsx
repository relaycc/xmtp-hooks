import { Routes, Route } from 'react-router-dom';
import { Directory, Core } from './components';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Directory />} />
        <Route path="/core/*" element={<Core />} />
        <Route path="/core" element={<Core />} />
      </Routes>
    </div>
  );
}

export default App;
