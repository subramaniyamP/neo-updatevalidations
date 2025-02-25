import Base      from './Base.mjs';
import VNodeUtil from '../util/VNode.mjs';

/**
 * @class Neo.manager.Component
 * @extends Neo.manager.Base
 * @singleton
 */
class Component extends Base {
    static config = {
        /**
         * @member {String} className='Neo.manager.Component'
         * @protected
         */
        className: 'Neo.manager.Component',
        /**
         * @member {Boolean} singleton=true
         * @protected
         */
        singleton: true
    }

    /**
     * @param {Object} config
     */
    construct(config) {
        super.construct(config);

        let me = this;

        Neo.first        = me.getFirst.bind(me); // alias
        Neo.getComponent = me.getById.bind(me);  // alias
    }

    /**
     * Returns the first component which matches the config-selector moving down the component items tree.
     * Use returnFirstMatch=false to get an array of all matching items instead.
     * If no match is found, returns null in case returnFirstMatch === true, otherwise an empty Array.
     * @param {Neo.component.Base|String} component
     * @param {Object|String|null} config
     * @param {Boolean} returnFirstMatch=true
     * @returns {Neo.component.Base|Neo.component.Base[]|null}
     */
    down(component, config, returnFirstMatch=true) {
        if (Neo.isString(component)) {
            component = this.getById(component);
        }

        let me          = this,
            matchArray  = [],
            returnValue = null,
            i           = 0,
            returnArray = [],
            childItems, configArray, configLength, len;

        if (Neo.isString(config)) {
            config = {
                ntype: config
            };
        } else if (!config) {
            config = {};
        }

        configArray  = Object.entries(config);
        configLength = configArray.length;

        configArray.forEach(([key, value]) => {
            if ((component[key] === value)
                || (key === 'ntype' && me.hasPrototypePropertyValue(component, key, value)))
            {
                matchArray.push(true);
            }
        });

        if (matchArray.length === configLength) {
            if (returnFirstMatch) {
                return component;
            }

            returnArray.push(component);
        }

        childItems = me.find({parentId: component.id});
        len        = childItems.length;

        for (; i < len; i++) {
            returnValue = me.down(childItems[i], config, returnFirstMatch);

            if (returnFirstMatch) {
                if (returnValue !== null) {
                    return returnValue;
                }
            } else if (returnValue.length > 0) {
                returnArray.push(...returnValue);
            }
        }

        return returnFirstMatch ? null: returnArray;
    }

    /**
     * @param {Array} path
     * @returns {String|null} the component id in case there is a match
     */
    findParentComponent(path) {
        let me  = this,
            i   = 0,
            len = path?.length || 0,
            id;

        for (; i < len; i++) {
            id = path[i];

            if (id && me.has(id)) {
                return id;
            }
        }

        return null;
    }

    /**
     * Returns all child components which are recursively matched via their parentId
     * @param {Neo.component.Base} component
     * @returns {Neo.component.Base[]} childComponents
     */
    getChildComponents(component) {
        let me             = this,
            directChildren = me.find('parentId', component.id) || [],
            components     = [],
            childComponents;

        directChildren.forEach(item => {
            components.push(item);

            childComponents = me.getChildComponents(item);

            childComponents && components.push(...childComponents);
        });

        return components;
    }

    /**
     * todo: replace all calls of this method to calls using the util.VNode class
     * Get the ids of all child nodes of the given vnode
     * @param vnode
     * @param childIds
     * @returns {Array} childIds
     */
    getChildIds(vnode, childIds) {
        return VNodeUtil.getChildIds(vnode, childIds);
    }

    /**
     * Returns all child components found inside the vnode tree
     * @param {Neo.component.Base} component
     * @returns {Neo.component.Base[]} childComponents
     */
    getChildren(component) {
        let childComponents = [],
            childNodes      = VNodeUtil.getChildIds(component.vnode),
            childComponent;

        childNodes.forEach(node => {
            childComponent = this.get(node);

            if (childComponent) {
                childComponents.push(childComponent);
            }
        });

        return childComponents;
    }

    /**
     * !! For debugging purposes only !!
     *
     * Get the first component based on the ntype or other properties
     *
     * @param {String|Object|Array} componentDescription
     * @param {Boolean} returnFirstMatch=true
     * @returns {Neo.component.Base|null|Neo.component.Base[]}
     *
     * @example
            // as String: ntype[comma separated propterties]
            Neo.first('toolbar button[text=Try me,icon=people]')
            // as Object: Add properties. ntype is optional
            Neo.first({
                icon: 'people'
            })
            // as Array: An Array of Objects. No Strings allowed
            Neo.first([{
                ntype: 'toolbar'
            },{
                ntype: 'button', text: 'Try me', icon: 'people
            }])

     * The returnFirstMatch flag allows to return all items and
     * not stop after the first result.
     *
     * @example
            Neo.first('button', false) // => [Button, Button, Button]
     */
    getFirst(componentDescription, returnFirstMatch = true) {
        let objects = [],
            app     = Neo.apps[Object.keys(Neo.apps)[0]],
            root    = app.mainView;

        /* create an array of objects from string */
        if (Neo.isString(componentDescription)) {
            const regex = /(\w*)(\[[^\]]*\])|(\w*)/g;
            let match;

            /* generate objects which contain the information */
            while (match = regex.exec(componentDescription)) {
                let [, ntype, pairs, ntypeOnly] = match, obj;

                ntype = ntype || ntypeOnly;
                obj = {ntype};

                if (pairs) {
                    const pairsRegex = /\[(.*?)\]/,
                        pairsMatch = pairs.match(pairsRegex);

                    if (pairsMatch) {
                        const pairs = pairsMatch[1].split(',');
                        pairs.forEach((pair) => {
                            const [key, value] = pair.split('=');
                            obj[key] = value.replace(/"/g, '');
                        });
                    }
                }
                objects.push(obj);

                regex.lastIndex++;
            }
        } else if (Neo.isObject(componentDescription)){
            objects.push(componentDescription);
        } else if (Neo.isArray(componentDescription)) {
            objects = componentDescription;
        }

        /* find the correct child using down() */
        const result = objects.reduce((acc, key) => {
            if (acc) {
                let child = acc.down(key, returnFirstMatch);

                if (!!child) {
                    return child;
                }
            }
            return null;
        }, root);

        return result
    }

    /**
     * Returns an Array containing the ids of all parent components for a given component
     * @param {Neo.component.Base} component
     * @returns {String[]} parentIds
     */
    getParentIds(component) {
        let parentIds = [];

        while (component?.parentId) {
            component = this.getById(component.parentId);

            if (component) {
                parentIds.push(component.id);
            }
        }

        return parentIds;
    }

    /**
     * @param {Array} path
     * @returns {Array}
     */
    getParentPath(path) {
        let me            = this,
            componentPath = [],
            i             = 0,
            len           = path?.length || 0;

        for (; i < len; i++) {
            if (me.has(path[i])) {
                componentPath.push(path[i]);
            }
        }

        return componentPath;
    }

    /**
     * Returns an Array containing all parent components for a given component or component id
     * @param {Neo.component.Base|String} component
     * @returns {Neo.component.Base[]} parents
     */
    getParents(component) {
        if (Neo.isString(component)) {
            component = this.getById(component);
        }

        let parents = [];

        while (component?.parentId) {
            component = this.getById(component.parentId);

            if (component) {
                parents.push(component);
            }
        }

        return parents;
    }

    /**
     * Check if the component had a property of any value somewhere in the Prototype chain
     *
     * @param {Neo.component.Base} component
     * @param {String} property
     * @param {*} value
     * @returns {boolean}
     */
    hasPrototypePropertyValue(component, property, value) {
        while (component !== null) {
            if (component.hasOwnProperty(property) && component[property] === value) {
                return true;
            }
            component = component.__proto__;
        }

        return false;
    }

    /**
     * Returns the first component which matches the config-selector.
     * Use returnFirstMatch=false to get an array of all matching items instead.
     * If no match is found, returns null in case returnFirstMatch === true, otherwise an empty Array.
     * @param {String} componentId
     * @param {Object|String|null} config
     * @param {Boolean} returnFirstMatch=true
     * @returns {Neo.component.Base|Neo.component.Base[]|null}
     */
    up(componentId, config, returnFirstMatch=true) {
        let component   = this.getById(componentId),
            returnArray = [],
            configArray, configLength, matchArray;

        if (Neo.isString(config)) {
            config = {
                ntype: config
            };
        } else if (!config) {
            config = {};
        }

        configArray  = Object.entries(config);
        configLength = configArray.length;

        while (component?.parentId) {
            component = this.getById(component.parentId);

            if (!component) {
                return returnFirstMatch ? null : returnArray;
            }

            matchArray = [];

            configArray.forEach(([key, value]) => {
                if (component[key] === value) {
                    matchArray.push(true);
                }
            });

            if (matchArray.length === configLength) {
                if (returnFirstMatch) {
                    return component;
                }

                returnArray.push(component);
            }
        }
    }
}

let instance = Neo.applyClassConfig(Component);

export default instance;
