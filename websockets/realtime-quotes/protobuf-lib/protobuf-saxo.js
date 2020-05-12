/*jslint this: true, browser: true, for: true, long: true, bitwise: true */
/*global window console protobuf */

/**
 * This code is derived from the JavaScript library available on Github:
 * https://github.com/SaxoBank/openapi-clientlib-js
 *
 */

const META_NULLS = "__meta_nulls";
const META_EMPTY = "__meta_empty";

/**
 * Map of accessors for custom global envelopes.
 */
const CUSTOM_ENVELOPES = {
    CollectionEnvelope: (data) => data.Collection
};

/**
 * Map of supported meta types that should be processed.
 * As an example, __meta_delete doesn't require any processing in this scope.
 */
const META_TYPES = {
    [META_NULLS]: true,
    [META_EMPTY]: true
};

function nullAccessor() {
    return null;
}

function emptyAccessor() {
    return [];
}

function processData(message, data, ids, accessor) {
    let i;
    let id;
    let field;
    for (i = 0; i < ids.length; i += 1) {
        id = ids[i];
        field = message.$type.fieldsById[id];
        if (!field) {
            continue;
        }
        data[field.name] = accessor();
    }
}

function processChild(message, data) {
    if (!message) {
        return data;
    }
    if (message[META_NULLS] && message[META_NULLS].length) {
        processData(message, data, message[META_NULLS], nullAccessor);
        // Remove deleting as soon as we move metadata to extensions.
        delete data[META_NULLS];
    }
    if (message[META_EMPTY] && message[META_EMPTY].length) {
        processData(message, data, message[META_EMPTY], emptyAccessor);
        // Remove deleting as soon as we move metadata to extensions.
        delete data[META_EMPTY];
    }
    return data;
}

function iterateTree(message, data) {
    let key;
    for (key in data) {
        if (data.hasOwnProperty(key) && !META_TYPES[key]) {
            let nextData = data[key];
            if (typeof nextData === "object") {
                processChild.call(this, message[key], data[key]);
                iterateTree.call(this, message[key], nextData);
            }
        }
    }
    return data;
}

/**
 * Responsible for processing of all custom meta fields of decoded message type.
 * More info: https://wiki/display/OpenAPI/Delta+compression+implementation+of+ProtoBuffers
 * @constructor
 */
function MetaProtobuf() {}

/**
 * Process data using message metadata. Iterate through each field and process supported metadata keys.
 *
 * @param {Object} message - Protobuf Message Type object.
 * @param {Object} data - JSON object. Object get's mutated.
 * @return {Object} The result of meta processing.
 */
MetaProtobuf.prototype.process = function (message, data) {
    let key;
    if (!message || !data) {
        return data;
    }
    iterateTree.call(this, [message], [data]);
    for (key in CUSTOM_ENVELOPES) {
        if (message.$type.name === key) {
            data = CUSTOM_ENVELOPES[key](data);
        }
    }
    return data;
};

/**
 * Parser Base
 * @constructor
 */
function ParserBase(name, engine = null) {
    // Parser name, used for lookup.
    this.name = name;
    // Optional parsing engine.
    this.engine = engine;
}

ParserBase.prototype.getSchemaType = function (schemaName, schemaType) {};

ParserBase.prototype.getSchema = function (name) {};

ParserBase.prototype.addSchema = function (schema, name) {};

ParserBase.prototype.parse = function (data, schemaName) {};

let wrappers = {
    register: function (wrappers) {
        if (!wrappers[".google.protobuf.Timestamp"]) {
            wrappers[".google.protobuf.Timestamp"] = {
                fromObject(object) {
                    return this.fromObject(object);
                },
                toObject(message, options) {
                    const { seconds, nanos } = message;
                    // Date with support for nano precision
                    const date = new Date(
                        Number(seconds) * 1000 + Math.floor(Number(nanos) / 1000000)
                    );
                    return date.toJSON();
                }
            };
        }
    }
};

const ROOT_OPTION_NAME = "saxobank_root";

/**
 * Create root schema and register custom wrappers to support JS types. ie. casting Google.Timestamp to JS Date.
 * @returns {Root}
 */
function createRootSchema() {
    let schemas = this.protobuf.Root.fromJSON(
        this.protobuf.common["google/protobuf/wrappers.proto"],
        this.protobuf.root
    );
    schemas = this.protobuf.Root.fromJSON(
        this.protobuf.common["google/protobuf/timestamp.proto"],
        schemas
    );
    return schemas;
}

/**
 * Protobuf Parser.
 */
function ParserProtobuf(name, engine) {
    this.name = name;

    // Parsing engine, currently only supported implementation is: https://github.com/dcodeIO/ProtoBuf.js
    this.protobuf = engine;

    wrappers.register(this.protobuf.wrappers);

    /**
     * Url to schema name map.
     */
    this.schemasMap = {};

    this.lastSchemaName = null;

    /**
     * Processing of supported meta fields of decoded message type.
     * @type {MetaProtobuf}
     */
    this.metaProcessor = new MetaProtobuf();
}

ParserProtobuf.prototype = Object.create(ParserBase.prototype, {
    constructor: {
        value: ParserProtobuf,
        enumerable: false,
        writable: true,
        configurable: true
    }
});

ParserProtobuf.prototype.getSchemaType = function (schemaName, typeName) {
    const schemas = this.schemasMap[schemaName];
    return schemas && schemas.root.lookup(typeName);
};

ParserProtobuf.prototype.getSchema = function (name) {
    return this.schemasMap[name];
};

/**
 * Parses and adds schema to local schema map.
 * @param {String} schemaData - The schema data, not parsed, in raw, string format.
 * @param {String} name - The schema name, under which it will be saved in schema map.
 * @return {boolean} - Returns true if there were no issues, false otherwise.
 */
ParserProtobuf.prototype.addSchema = function (schemaData, name) {
    if (this.schemasMap[name]) {
        // Schemas for this name already exist.
        return true;
    }

    let schema = createRootSchema.call(this, this.protobuf);
    try {
        schema = this.protobuf.parse(schemaData, schema.root, {
            keepCase: true
        });
    } catch (e) {
        console.error("Schema parsing failed with " + e.message + " and name " + name);
        return false;
    }

    this.schemasMap[name] = schema;
    this.lastSchemaName = name;
    return true;
};

/**
 * Parse data using given schema. Data should be in base64 format.
 * @param {String} data - The data to parse. Data should be in base64 format.
 * @param {String} schemaName - The name of a schema to be used for parsing.
 * @return {Object} - Result of parsing, if successful. Returns null if parsing fails or there is no data.
 */
ParserProtobuf.prototype.parse = function (data, schemaName) {
    const schemas = this.getSchema(schemaName);
    if (!schemas || !data) {
        return null;
    }
    const rootTypeName = schemas.root.getOption(ROOT_OPTION_NAME);
    if (!rootTypeName) {
        console.error("Parsing failed. Missing root message name " + rootTypeName);
        return null;
    }
    const rootType = this.getSchemaType(schemaName, rootTypeName);
    if (!rootType) {
        console.error("Parsing failed. Root type not found. Name: " + rootTypeName);
        return null;
    }
    let byteArray;
    // With support from raw websocket streaming, it's possible to get raw ArrayBuffer.
    if (data instanceof Uint8Array) {
        byteArray = data;
    } else {
        byteArray = new Uint8Array(this.protobuf.util.base64.length(data));
        const offset = 0;
        this.protobuf.util.base64.decode(data, byteArray, offset);
    }
    const message = rootType.decode(byteArray);
    const jsonData = (
        message
        ? message.toJSON()
        : null
    );
    return this.metaProcessor.process(message, jsonData);
};
