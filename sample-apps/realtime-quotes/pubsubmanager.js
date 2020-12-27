/*
 *
 *  Air Horner
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

// Info: https://paul.kinlan.me/building-a-pubsub-api-in-javascript/
// Source: https://github.com/creadone/EventManager with origin https://github.com/PaulKinlan/EventManager

const PubSubManager = {
    // This is the object containing all subjects as array with the subscribed functions.
    "events": {},
    // Use "publish" to publish data to all subscribers.
    // Example:
    // PubSubManager.publish("MySubjectWithString", "Received too @ " + (new Date()).toString());
    "publish": function (subject, data) {
        if (this.events.hasOwnProperty(subject)) {
            this.events[subject].forEach(function (handler) {
                handler.call(this, data);
            });
        }
    },
    // Use "subscribe" to subscribe a function to a certain subject.
    // Example:
    // PubSubManager.subscribe("MySubjectWithString", doSomething);
    "subscribe": function (subject, handler) {
        if (!this.events.hasOwnProperty(subject)) {
            this.events[subject] = [];  // Create subject array.
        }
        this.events[subject].push(handler);
    },
    // Use "unsubscribe" to remove a subscription.
    // Example:
    // PubSubManager.unsubscribe("MySubjectWithString", doSomething);
    "unsubscribe": function (subject, handler) {
        if (this.events.hasOwnProperty(subject)) {
            this.events[subject].splice(this.events[subject].indexOf(handler), 1);
            if (this.events[subject].length === 0) {
                delete this.events[subject];
            }
        }
    }
};