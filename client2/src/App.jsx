import React from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";

import Room from "./components/Room"
import Login from "./components/login"
import JoinRoom from "./components/joinRoom"
import Disconnected from "./components/Disconnected"


function App() {
    return <div className="App">
		<BrowserRouter>
			<Switch>
				<Route path="/" exact component={Login}></Route>
				<Route path="/joinRoom" exact component={JoinRoom}></Route>
				<Route path="/room/:roomID" component={Room}></Route>
				<Route path="/disconnected/:roomID" component={Disconnected}></Route>
			</Switch>
		</BrowserRouter>
	</div>;
}

export default App;
