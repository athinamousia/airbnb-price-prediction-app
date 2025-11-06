import React from 'react'
import { useState, useEffect} from "react";
import { Typography, Divider, Row, Col, Spin } from "antd";

import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Label
} from "recharts";
import { getStats} from "../api/api";
import Map from "./map";


const { Title } = Typography;
const COLORS = ['#F47A1F','#7f1005', '#FDBB2F', '#377B2B', '#7AC142', '#007CC3',  '#00529B'] //, '#8DC77B', '#A5D297', '#E2CF45', '#F8C12D'];

const RADIAN = Math.PI / 180;
const CustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius,  value
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9}>
      {`${value}`}
    </text>
  );
}


const Stats = () => {
  const [statsData, setStatsData] = useState(null);

  useEffect(() => {
    getStats().then((data) => {
      setStatsData(data);
    });
  }, []);

  return (
    <div>
      <Title>Statistics dashboard</Title>
      <Divider />
      {statsData ? (
        <>
          <Row className="row" gutter={[24, 24]}>
            <Col sm={{ span: 24 }} lg={{ span: 12 }}>
              <div className="chart-container">
                <Title level={4}>Average price per people accommodated</Title>
                <div className="chart-inner">
                  <ResponsiveContainer height={350}>
                    <BarChart
                      data={statsData.barChart_acom}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 5,
                        bottom: 15,
                      }} 
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis  dataKey="accommodates">
                        <Label value="People accomodated" offset={-8} position="insideBottom" />
                      </XAxis>
                      <YAxis> 
                        <Label value="Average Price" offset={0} position="insideLeft" angle={-90}/> 
                      </YAxis>
                      <Tooltip />
                      {/* <Legend /> */}
                      <Bar dataKey="price" fill="#7f1005" label={{ position: 'top' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Col>
            <Col sm={{ span: 24 }} lg={{ span: 12 }}>
              <div className="chart-container">
                <Title level={4}>Heatmap of prices in the area of Athens</Title>
                <div className="chart-inner">
                  <Map/>
                </div>
              </div>
            </Col>
          </Row>
          <Row className="row" gutter={[24, 24]}>
            <Col sm={{ span: 24 }} lg={{ span: 12 }}>
              <div className="chart-container">
                <Title level={4}>Listings per price </Title>
                <div className="chart-inner">
                  <ResponsiveContainer height={350}>
                    <AreaChart
                      data={statsData.barChart_prices}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 5,
                        bottom: 15,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="price" angle={45} textAnchor="begining" interval={15} tick={{fontSize: 9}}>
                        <Label value="Price" offset={-10} position="insideBottom" />
                      </XAxis>
                      <YAxis> 
                        <Label value="Amount of listings" offset={0} position="insideLeft" angle={-90}/> 
                      </YAxis>
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="num"
                        stackId="1"
                        stroke="#7f1005"
                        fill="#7f1005"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Col>
            <Col style={{ width: "50%" }}>
              <div className="chart-container">
                <Title level={4} fontSize={9}>Count of listings (outer) and average price (inner) per room type</Title>
                <div className="chart-inner" >
                  <ResponsiveContainer style={{height:"100%" }}>
                      <PieChart >                       
                        <Pie data={statsData.pieChart_room_type} 
                             dataKey="price" 
                             nameKey="type" 
                             cx="50%" 
                             cy="50%" 
                             outerRadius={80} 
                             fill="#8884d8"
                             label={CustomizedLabel}
                             labelLine={false}
                             
                             >
                          {statsData.pieChart_room_type.map((_entry, index) => (
                              <Cell key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]} />
                              ))}
                        </Pie> 

                        <Pie data={statsData.pieChart_room_type_count} 
                             dataKey="count" 
                             nameKey="type" 
                             cx="50%" 
                             cy="50%" 
                             innerRadius={100} 
                             outerRadius={150} 
                             fill="#82ca9d" 
                             label
                             >

                        {statsData.pieChart_room_type.map((_entry, index) => (
                          <Cell key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]} />
                          ))}
                        
                        </Pie>   
                        <Legend payload={statsData.pieChart_room_type.map((_entry, index) => (
                          { value: `${_entry.type}`,
                            color: COLORS[index % COLORS.length]
                          }))}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Col>
            </Row>
            <Row className="row" gutter={[24, 24]}>
              <Col style={{ width: "100%" }}>
                <div className="chart-container">
                  <Title level={4}>Average price per neighbourhood</Title>
                  <div className="chart-inner">
                    <ResponsiveContainer>
                      <BarChart
                        data={statsData.barChart_all_neigh}
                        margin={{
                          top: 20,
                          right: 60,
                          left: 5,
                          bottom: 90,
                        }} >
                        <CartesianGrid strokeDasharray="3 3" height={200} />
                        <XAxis dataKey="neighbourhood" angle={30} textAnchor="begining" interval={0} tick={{fontSize: 9}}/>
                        <YAxis height={10}>
                          <Label value="Price" offset={0} position="insideLeft" angle={-90}/> 
                        </YAxis>
                        <Tooltip />
                        <Legend verticalAlign="top" />
                        <Bar dataKey="price" fill="#7f1005" label={{ position: 'top' }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Col>
            </Row>
        </>
      ) : (
        <div className="stats-loader">
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default Stats;
