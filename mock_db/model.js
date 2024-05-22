import data from "./data.js";

const errorTypes = {
    NOT_FOUND: 404,
    BAD_ARGUMENTS: 400,
};

let _id = 4;

export default class Model {

    constructor(definition={}) {
        if (!definition.modelName)
            throw new Error('definition.modelName is required');
        if (!definition.dataName)
            throw new Error('definition.dataName is required');
        if (!definition.idName)
            throw new Error('definition.idName is required');
        if (!definition.relation)
            throw new Error('definition.relation is required');
        if (!definition.errorClass)
            throw new Error('definition.errorClass is required');
        if (!definition.pubsub)
            throw new Error('definition.pubsub is required');

        this.modelName = definition.modelName;
        this.dataName = definition.dataName;
        this.idName = definition.idName;
        this.relation = definition.relation;
        this.errorClass = definition.errorClass;
        this.pubsub = definition.pubsub;
    }
    find(id) {
        if (typeof id !== 'string' && typeof id !== 'number')
            throw new this.errorClass(`${this.idName} is required`, errorTypes.BAD_ARGUMENTS);

        const entities = data[this.dataName];
        const entity = entities.find(entity => {
            return entity[this.idName] === id;
        });

        entity[this.relation.propName] = this.getRelation(entity);

        if (!entity)
            throw new this.errorClass(`${this.modelName} not found`, errorTypes.NOT_FOUND);

        return entity;
    }

    findAll() {
        const entities = data[this.dataName];

        entities.forEach(entity => {
            entity[this.relation.propName] = this.getRelation(entity);
        });

        return entities;
    }

    create(params) {
        if (typeof params !== 'object')
            throw new this.errorClass(`params is required`, errorTypes.BAD_ARGUMENTS);

        const entities = data[this.dataName];
        const entity = {
            ...params,
            [this.idName]: String(_id++),
        };

        entities.push(entity);

        const { createEvents, instance } = this.pubsub;
        createEvents.forEach(event => {
            instance.publish(event.name, { [event.key]: entity });
        });

        entity[this.relation.propName] = this.getRelation(entity);

        return entity;
    }

    update(id, params) {
        if (typeof id !== 'string' && typeof id !== 'number')
            throw new this.errorClass(`${this.idName} is required`, errorTypes.BAD_ARGUMENTS);
        if (typeof params !== 'object')
            throw new this.errorClass(`params is required`, errorTypes.BAD_ARGUMENTS);

        const entities = data[this.dataName];
        const entity = entities.find(entity => {
            return entity[this.idName] === id;
        });

        if (!entity)
            throw new this.errorClass(`${this.modelName} not found`, errorTypes.NOT_FOUND);

        Object.assign(entity, params);

        entity[this.relation.propName] = this.getRelation(entity);

        return entity;
    }

    destroy(id) {
        if (typeof id !== 'string' && typeof id !== 'number')
            throw new this.errorClass(`${this.idName} is required`, errorTypes.BAD_ARGUMENTS);

        const entities = data[this.dataName];
        const entityIndex = entities.findIndex(entity => {
            return entity[this.idName] === id;
        });

        if (entityIndex === -1)
            throw new this.errorClass(`${this.modelName} not found`, errorTypes.NOT_FOUND);

        entities.splice(entityIndex, 1);


        return { message: `${this.modelName} deleted` };
    }

    getRelation(entity) {
        const relationData = data[this.relation.dataName];
        if (this.relation.type === 'belongsTo') {
            return relationData.find(relation => {
                return relation[this.relation.otherIdName] === entity[this.relation.idName];
            });
        } else if (this.relation.type === 'hasMany') {
            return relationData.filter(relation => {
                return relation[this.relation.otherIdName] === entity[this.relation.idName];
            });
        }
    }
};
