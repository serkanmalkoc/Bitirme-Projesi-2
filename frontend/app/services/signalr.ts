import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("https://localhost:7085/toolroomHub")
  .withAutomaticReconnect()
  .build();

export default connection;