/*jslint this: true, browser: true, for: true, long: true, bitwise: true */
/*global window console */

/**
 * This code is derived from the JavaScript library available on Github:
 * https://github.com/SaxoBank/openapi-clientlib-js
 *
 */

/**
 * Parser Base
 * @constructor
 * @param {string} name The name of the parser, like "default".
 * @param {Object} engine The implementation engine to use.
 */
function ParserBase(name, engine) {
    // Parser name, used for lookup.
    this.name = name;
    // Optional parsing engine.
    if (engine === undefined) {
        this.engine = null;
    } else {
        this.engine = engine;
    }
}

let wrappers = {
    register: function (wrappers) {
        if (!wrappers[".google.protobuf.Timestamp"]) {
            wrappers[".google.protobuf.Timestamp"] = {
                fromObject(object) {
                    return this.fromObject(object);
                },
                toObject(message) {
                    const {seconds, nanos} = message;
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

/**
 * Create root schema and register custom wrappers to support JS types. ie. casting Google.Timestamp to JS Date.
 * @returns {Root} The root schema
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
 * @param {string} name The name of the parser, like "default".
 * @param {Object} engine The implementation engine to use.
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
    let schema;
    if (this.schemasMap[name]) {
        // Schemas for this name already exist.
        return true;
    }
    schema = createRootSchema.call(this, this.protobuf);
    try {
        schema = this.protobuf.parse(schemaData, schema.root, {
            keepCase: true
        });
    } catch (e) {
        console.error("Schema parsing failed with " + e.message + " and name " + name);
        return false;
    }
    this.schemasMap[name] = schema;
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
    const rootTypeName = schemas.root.getOption("saxobank_root");
    if (!rootTypeName) {
        console.error("Parsing failed. Missing root message name " + rootTypeName);
        return null;
    }
    const rootType = this.getSchemaType(schemaName, rootTypeName);
    if (!rootType) {
        console.error("Parsing failed. Root type not found. Name: " + rootTypeName);
        return null;
    }
    // With support from raw websocket streaming, it's possible to get raw ArrayBuffer.
    const message = rootType.decode(data);
    return (
        message
        ? message.toJSON()
        : null
    );
};
