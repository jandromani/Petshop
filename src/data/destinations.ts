export type DestinationRegion="Europe"|"Asia"|"Africa"|"Americas";
export type LiveDestination={city:string;country:string;region:DestinationRegion;lat:number;lng:number};

export const liveDestinations:LiveDestination[]=[
  {city:"Madrid",country:"Spain",region:"Europe",lat:40.4168,lng:-3.7038},
  {city:"Costa Adeje",country:"Spain",region:"Europe",lat:28.0864,lng:-16.7347},
  {city:"Maspalomas",country:"Spain",region:"Europe",lat:27.7606,lng:-15.5860},
  {city:"Málaga",country:"Spain",region:"Europe",lat:36.7213,lng:-4.4214},
  {city:"Benidorm",country:"Spain",region:"Europe",lat:38.5411,lng:-0.1225},
  {city:"Lisbon",country:"Portugal",region:"Europe",lat:38.7223,lng:-9.1393},
  {city:"Faro",country:"Portugal",region:"Europe",lat:37.0194,lng:-7.9304},
  {city:"Funchal",country:"Portugal",region:"Europe",lat:32.6669,lng:-16.9241},
  {city:"Valletta",country:"Malta",region:"Europe",lat:35.8989,lng:14.5146},
  {city:"Antalya",country:"Türkiye",region:"Europe",lat:36.8969,lng:30.7133},
  {city:"Paphos",country:"Cyprus",region:"Europe",lat:34.7754,lng:32.4245},
  {city:"Heraklion",country:"Greece",region:"Europe",lat:35.3387,lng:25.1442},
  {city:"Agadir",country:"Morocco",region:"Africa",lat:30.4278,lng:-9.5981},
  {city:"Hammamet",country:"Tunisia",region:"Africa",lat:36.4000,lng:10.6167},
  {city:"Hurghada",country:"Egypt",region:"Africa",lat:27.2579,lng:33.8116},
  {city:"Chiang Mai",country:"Thailand",region:"Asia",lat:18.7883,lng:98.9853},
  {city:"Hua Hin",country:"Thailand",region:"Asia",lat:12.5684,lng:99.9577},
  {city:"Da Nang",country:"Vietnam",region:"Asia",lat:16.0544,lng:108.2022},
  {city:"Nha Trang",country:"Vietnam",region:"Asia",lat:12.2388,lng:109.1967},
  {city:"Ubud",country:"Indonesia",region:"Asia",lat:-8.5069,lng:115.2625},
  {city:"Sanur",country:"Indonesia",region:"Asia",lat:-8.6900,lng:115.2630},
  {city:"George Town",country:"Malaysia",region:"Asia",lat:5.4141,lng:100.3288},
  {city:"Kuala Lumpur",country:"Malaysia",region:"Asia",lat:3.1390,lng:101.6869},
  {city:"Playa del Carmen",country:"Mexico",region:"Americas",lat:20.6296,lng:-87.0739},
  {city:"Mérida",country:"Mexico",region:"Americas",lat:20.9674,lng:-89.5926},
  {city:"Buenos Aires",country:"Argentina",region:"Americas",lat:-34.6037,lng:-58.3816},
  {city:"Mendoza",country:"Argentina",region:"Americas",lat:-32.8895,lng:-68.8458},
  {city:"Lima",country:"Peru",region:"Americas",lat:-12.0464,lng:-77.0428},
  {city:"Cartagena",country:"Colombia",region:"Americas",lat:10.3910,lng:-75.4794}
];
