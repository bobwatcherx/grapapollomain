import { ApolloServer, gql } from 'apollo-server';
import { PubSub } from 'graphql-subscriptions';
import { createServer } from 'http';
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import express from 'express'
const app = express();
const httpServer = createServer(app);
const typeDefs = gql`
type Query {
  test:[Nama]
}
type Subscription{
  subtest:Nama!
}
type Mutation {
  hello(
    nama:String,
    alamat:String,
    umur:Int
  ):Nama!
}

type Nama{
  nama:String
  alamat:String
  umur:Int
}
`;
const NEW_USER = 'NEW_USER'
let data = [{
  nama:"jono",
  alamat:"bugi",
  umur:20
}]
const resolvers = {
  Subscription:{
    subtest:{
      subscribe:(_,__,{pubsub})=>{
        pubsub.asyncIterator(NEW_USER)
      }
    }
  },
  Query: {
  test:()=> {
    return data
  }
  },
  Mutation:{
    hello:async (_,payload,{pubsub})=>{
      pubsub.publish(NEW_USER,{
        subtest:payload
      })
      console.log(payload)
      let post = await data.push({
        nama:payload.nama,
        alamat:payload.alamat,
        umur:payload.umur,
      })
      return {...payload}
    }
  }
};
const pubsub = new PubSub();
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
const schema = makeExecutableSchema({ typeDefs, resolvers });
const serverCleanup = useServer({ schema }, wsServer);
const server = new ApolloServer({
  schema,
  plugins: [
     ApolloServerPluginDrainHttpServer({ httpServer }),
     {
       async serverWillStart() {
         return {
           async drainServer() {
             await serverCleanup.dispose();
           },
         };
       },
     },
   ],
});

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
