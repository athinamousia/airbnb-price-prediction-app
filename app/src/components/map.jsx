import React, { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat";
import { addressPoints } from "../data/listing_points";

// Code taken from: https://stackoverflow.com/questions/63640081/is-there-a-way-to-use-leaflet-heat-in-react 

export default function Map() {
  useEffect(() => {
    var map = L.map("map").setView([37.983810, 23.727539], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const points = addressPoints
      ? addressPoints.map((p) => {
          return [p[0], p[1]];
        })
      : [];

    L.heatLayer(points, {blur:10, radius: 10, scaleRadius:true}).addTo(map);
  }, []);

  return <div id="map" style={{ height: "350px" }}></div>;
}
