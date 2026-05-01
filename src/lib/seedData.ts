import { db } from './firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

export const REAL_ROUTES = [
  {
    id: 'r1',
    name: 'Nagerjala to Udaipur',
    color: '#3b82f6',
    stops: [
      { id: 's1', name: 'Nagerjala', location: { lat: 23.8214, lng: 91.2723 } },
      { id: 's_amt', name: 'Amtali', location: { lat: 23.7744, lng: 91.2724 } },
      { id: 's2', name: 'Bishalgarh', location: { lat: 23.6841, lng: 91.2589 } },
      { id: 's3', name: 'Bishramganj', location: { lat: 23.6231, lng: 91.3060 } },
      { id: 's4', name: 'Udaipur', location: { lat: 23.5332, lng: 91.4828 } },
    ]
  },
  {
    id: 'r2',
    name: 'Nagerjala to Sabroom',
    color: '#10b981',
    stops: [
      { id: 's1', name: 'Nagerjala', location: { lat: 23.8214, lng: 91.2723 } },
      { id: 's2', name: 'Bishalgarh', location: { lat: 23.6841, lng: 91.2589 } },
      { id: 's4', name: 'Udaipur', location: { lat: 23.5332, lng: 91.4828 } },
      { id: 's_gj', name: 'Garjee', location: { lat: 23.4287, lng: 91.4866 } },
      { id: 's5', name: 'Santirbazar', location: { lat: 23.2952, lng: 91.5601 } },
      { id: 's_jb', name: 'Jolaibari', location: { lat: 23.2355, lng: 91.5645 } },
      { id: 's7', name: 'Sabroom', location: { lat: 23.0006, lng: 91.7330 } },
    ]
  },
  {
    id: 'r3',
    name: 'Chandrapur to Teliamura',
    color: '#f59e0b',
    stops: [
      { id: 's8', name: 'Chandrapur', location: { lat: 23.8340, lng: 91.3000 } },
      { id: 's9', name: 'Khayerpur', location: { lat: 23.8339, lng: 91.3323 } },
      { id: 's_rb', name: 'Ranirbazar', location: { lat: 23.8329, lng: 91.3592 } },
      { id: 's10', name: 'Jirania', location: { lat: 23.8242, lng: 91.4190 } },
      { id: 's_cp', name: 'Champaknagar', location: { lat: 23.8239, lng: 91.4646 } },
      { id: 's11', name: 'Teliamura', location: { lat: 23.8370, lng: 91.6425 } },
    ]
  },
  {
    id: 'r4',
    name: 'Chandrapur to Dharmanagar',
    color: '#8b5cf6',
    stops: [
      { id: 's8', name: 'Chandrapur', location: { lat: 23.8340, lng: 91.3000 } },
      { id: 's11', name: 'Teliamura', location: { lat: 23.8370, lng: 91.6425 } },
      { id: 's12', name: 'Ambassa', location: { lat: 23.9161, lng: 91.8540 } },
      { id: 's_mn', name: 'Manu', location: { lat: 23.9678, lng: 91.9567 } },
      { id: 's13', name: 'Kumarghat', location: { lat: 24.1613, lng: 92.0305 } },
      { id: 's_pt', name: 'Pecharthal', location: { lat: 24.1994, lng: 92.1158 } },
      { id: 's_ps', name: 'Panisagar', location: { lat: 24.2541, lng: 92.1481 } },
      { id: 's14', name: 'Dharmanagar', location: { lat: 24.3807, lng: 92.1648 } },
    ]
  }
];

export async function seedRoutes() {
  for (const route of REAL_ROUTES) {
    await setDoc(doc(db, 'routes', route.id), route, { merge: true });
  }
}
