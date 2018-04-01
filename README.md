## V-Model

[![npm version](https://img.shields.io/npm/v/v-model.svg?style=flat-square)](https://www.npmjs.org/package/v-model)
[![build status](https://img.shields.io/travis/laoshu133/v-model.svg?style=flat-square)](https://travis-ci.org/laoshu133/v-model)

V-Model is a model plugin for Vue.js, like ng-resource.
based on axios, path-to-regexp, and bluebird.

The V-Model provides interaction support with RESTful services, can work with Vue.js 1.x and 2.x.

See more about [ng-resource](https://docs.angularjs.org/api/ngResource/service/$resource)

## Installation

```
> npm i -S v-model
```

```javascript
import Model from 'v-model';

// set baseURL
Model.http.defaults.baseURL = '//api.laoshu133.com';

// install
Vue.use(Model);
```

## Usage

```javascript
import Vue from 'vue';
import Model from 'v-model';

// set baseURL
Model.http.defaults.baseURL = '//api.laoshu133.com';

// install plugin
Vue.use(Model);

const PostModel = Model.extend('/posts/:id', {
    publish: { method: 'POST' }
}, {
    EDITING: 0,
    PUBLISHED: 1
});

const app = new Vue({
    el: '#app',
    data: {
        post: new PostModel({
            status: PostModel.EDITING,
            content: '',
            title: ''
        })
    },
    methods: {
        load(id) {
            this.post = PostModel.find({
                id: id
            });

            return this.post.$promise;
        },
        save(data) {
            return this.post.$save(data);
        }
    }
});
```

## Model Factory

Before you can create model(s), you need to generate a Model.

```javascript
Model.extend(url, actions, staticProps, options);
```

#### url

An Express-style path string, e.g `/posts/:id`.

#### actions

Hash with declaration of custom actions.

```
{
    action1: {method:?, params:?, isArray:?, headers:?, ...},
    action2: {method:?, params:?, isArray:?, hasPagination:?, ...}
}
```

Default actions:

```
{
    find: { method: 'GET' },
    save: { method: 'POST' },
    update: { method: 'PUT' },
    delete: { method: 'DELETE' },
    query: { method: 'GET', isArray:true }
};
```

Where:

- `action` {String} The name of action.
- `method` {String} Case insensitive HTTP method (e.g. GET, POST, PUT, DELETE, JSONP, etc).
- `params` {Object} Optional set of pre-bound parameters for this action.
- `headers` {Object} Optional set of pre-bound request headers for this action.
- `timeout` {Number} timeout in milliseconds.
- `isArray` {Boolean} If true then the returned object for this action is an array.
- `hasPagination` {Boolean} Only work with `isArray: true`, if true then tranform the request result to `{items: requestResult, pagination: {num: ?, size: ?, total: ?}}`


#### staticProps

Hash with declaration of static properties.

```
Model.extend('/posts/:id', null, {
    EDITING: 0,
    PUBLISHED: 1
});
```

#### options

Set http request default settings for.

Where:

- `baseURL` will be prepended to `url` unless `url` is absolute.
- `headers` are custom headers to be sent

See more [axios config](https://github.com/mzabriskie/axios#request-config)


## API

With static method:

```javascript
// find single post
const post = PostModel.find({
    id: 1
});

// find post list
const posts = PostModel.query({
    status: PostModel.PUBLISHED
});

// update
const post = PostModel.update({
    id: 1,
    title: 'New post title'
});

// delete
PostModel.delete({
    id: 1
});
```

With instance method:

```javascript
// create/save
let post = new PostModel();
let promise = post.$save({
    title: 'Post title'
})

// update
let post = new PostModel({
    id: 1,
    title: 'Post title'
});
let promise = post.$update({
    title: 'New post title'
});
```

## Pagination

V-Model support pagination via reponse headers `X-Pagination`.

Some http request:

```
> GET /posts?page_num=1&page_size=20 HTTP/1.1
> Host: api.laoshu133.com
> User-Agent: curl/7.49.1
>
< HTTP/1.1 200 OK
< Content-Type: application/json; charset=utf-8
< X-Pagination: {"num":1,"size":20,"total":44}

[{"id":1,"title":"Post title","content":"content..."}]
```

Usage:

```javascript
const PostModel = Model.extend('/posts/:id', {
    list: { method: 'get', hasPagination: true }
});

let postsData = PostModel.list({
    page_size: 20,
    page_num: 1
});

postsData.$promise.then(data => {
    console.log(data === postsData); // true
    console.log(postsData); // { "pagination":{"num":1,"size":20,"total":44}, "items": [...]}
});
```

## Cancellation

Sometimes we need to abort the request, such as quick switch page number.

Usage:

```javascript
import Model from 'v-model';
import Pormise from 'bluebird';

// enable bluebird cancellation
Promise.config({
    cancellation: true
});

const PostModel = Model.extend('/posts/:id', {
    list: { method: 'get', hasPagination: true }
});

new Vue({
    data() {
        return {
            list: {
                page_num: 1
            },
            itemsData: {
                pagination: { num: 1, size: 20, total: 0 },
                items: []
            }
        }
    },
    methods: {
        load() {
            // Cancel the last request
            // If it has not responded yet
            let promise = this.itemsData.$promise;
            if(promise) {
                promise.cancel();
            }

            // make a new request
            this.itemsData = PostModel.list(list);
        }
    },
    watch: {
        list() {
            this.load();
        }
    },
    created() {
        this.load();
    }
});
```


## $resolved flag

The V-Model instance/result has a `$resolved` flag.
Can be used for loading status.

Usage:

```html
<template>
    <div class="main">
        <div class="list">
            <div v-if="!itemsData.$resolved" class="loading">Loading...</div>
            <ul v-else>
                <li v-for="item in itemsData.items">{{item.id}}</li>
            </ul>
        </div>
        <div class="pagination" v-if="itemsData.$resolved">...</div>
    </div>
</template>
<script>
import Model from 'v-model';

const PostModel = Model.extend('/posts/:id', {
    list: { method: 'get', hasPagination: true }
});

export default {
    data() {
        return {
            itemsData: {
                pagination: { num: 1, size: 20, total: 0 },
                items: []
            }
        };
    },
    created() {
        this.itemsData = PostModel.list({
            page_num: 1
        });
    }
};
</script>
```


## Interceptors

You can intercept requests or responses.

```
// global interceptor
const http = PostModel.http;

// request
http.interceptors.request.use(beforeSend, requestError);

// response
http.interceptors.response.use(afterSend, responseError);
```

See more [axios Interceptors](https://github.com/mzabriskie/axios#interceptors)


## Running tests

```
> npm test
```

## License

MIT
