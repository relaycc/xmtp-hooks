import { Link } from 'react-router-dom';

export const Directory = () => {
  return (
    <main>
      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        <Link to="/core">Core</Link>
      </nav>
    </main>
  );
};
