import Model from "./mock_db/model.js";

import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { ApolloError as errorClass } from "apollo-server";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { createHandler } from 'graphql-http/lib/use/express';
import { PubSub } from 'graphql-subscriptions';

import fs from 'fs';
import express from 'express';

const pubsub = new PubSub();

const bookModel = new Model({
    modelName: 'Book',
    dataName: 'books',
    idName: 'id',
    relation: {
        type: 'belongsTo',
        dataName: 'authors',
        idName: 'authorId',
        otherIdName: 'id',
        propName: 'author',
    },
    errorClass,
    pubsub: {
        instance: pubsub,
        createEvents: [
            { name: 'BOOK_ADDED', key: 'bookAdded' }
        ],
    }
});

const authorModel = new Model({
    modelName: 'Author',
    dataName: 'authors',
    idName: 'id',
    relation: {
        type: 'hasMany',
        dataName: 'books',
        idName: 'id',
        otherIdName: 'authorId',
        propName: 'books',
    },
    errorClass,
    pubsub: {
        instance: pubsub,
        createEvents: [],
    }
});

const schema = makeExecutableSchema({ 
    typeDefs: fs.readFileSync('./schema.graphql', 'utf8'), 
    resolvers: {
        Query: {
            books: () => bookModel.findAll(),
            book: (_, { id }) => bookModel.find(id),
            authors: () => authorModel.findAll(),
        },
        Mutation: {
            createBook: (_, { authorId, title, releaseYear }) => {
                return bookModel.create({ authorId, title, releaseYear });
            },
            updateBook: (_, { id, authorId, title, releaseYear }) => {
                return bookModel.update(id, { authorId, title, releaseYear });
            },
            deleteBook: (_, { id }) => {
                return bookModel.destroy(id);
            },
        },
        Subscription: {
            bookAdded: {
                subscribe: () => pubsub.asyncIterator(['BOOK_ADDED']),
            },
        },
    } 
});

const app = express();
const port = 3000;
app.use(express.static('public'));
app.post('/graphql', createHandler({ schema }));
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

const wsPort = 4000;
const wsServer = new WebSocketServer({
    port: wsPort,
    path: '/graphql',
});
useServer({ schema }, wsServer);
console.log(`Websocket Server is running on ws://localhost:${wsPort}`);

