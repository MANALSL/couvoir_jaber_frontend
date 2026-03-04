import { Outlet } from 'react-router-dom';

const Production = () => {
    return (
        <div className="space-y-6">
            <Outlet />
        </div>
    );
};

export default Production;
