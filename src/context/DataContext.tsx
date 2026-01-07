import { createContext, useContext, useState, ReactNode } from 'react';
import { houses as initialHouses, tenants as initialTenants, House, Tenant } from '@/lib/mockData';

interface DataContextType {
  houses: House[];
  tenants: Tenant[];
  setHouses: React.Dispatch<React.SetStateAction<House[]>>;
  setTenants: React.Dispatch<React.SetStateAction<Tenant[]>>;
  addHouse: (house: Omit<House, 'id'>) => string;
  addTenant: (tenant: Omit<Tenant, 'id'>) => void;
  updateTenant: (id: string, data: Partial<Tenant>) => void;
  deleteTenant: (id: string) => void;
  deleteHouse: (id: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [houses, setHouses] = useState<House[]>(initialHouses);
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);

  const addHouse = (houseData: Omit<House, 'id'>) => {
    const newId = (houses.length + 1).toString();
    const newHouse: House = { ...houseData, id: newId };
    setHouses(prev => [...prev, newHouse]);
    return newId;
  };

  const addTenant = (tenantData: Omit<Tenant, 'id'>) => {
    const newTenant: Tenant = {
      ...tenantData,
      id: String(Date.now()),
    };
    setTenants(prev => [...prev, newTenant]);
  };

  const updateTenant = (id: string, data: Partial<Tenant>) => {
    setTenants(prev =>
      prev.map(t => (t.id === id ? { ...t, ...data } : t))
    );
  };

  const deleteTenant = (id: string) => {
    setTenants(prev => prev.filter(t => t.id !== id));
  };

  const deleteHouse = (id: string) => {
    // First, unassign any tenants from this house
    setTenants(prev => prev.filter(t => t.houseId !== id));
    // Then delete the house
    setHouses(prev => prev.filter(h => h.id !== id));
  };

  return (
    <DataContext.Provider
      value={{
        houses,
        tenants,
        setHouses,
        setTenants,
        addHouse,
        addTenant,
        updateTenant,
        deleteTenant,
        deleteHouse,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
