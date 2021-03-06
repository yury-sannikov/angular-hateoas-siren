'use strict';
describe("Hateoas Interface module", function () {

	var getMockAngularResponseData = function () {
		return angular.copy({
								"properties": {
									"Id": 1,
									"Name": "Item1",
									"Price": 2.99
								},
								"links": [{
									"rel": ["self"],
									"href": "api/Product/1"
								},
								{
									"rel": ["parent","__query"],
									"href": "api/Product"
								},
								{
									"rel": ["get_product_by_name", "by_name"],
									"href": "api/Product/Item1"
								},
								{
									// Plain rel is not in Siren spec https://github.com/kevinswiber/siren
									// Compatibilty testing
									"rel": "get_productdetails_by_id",
									"href": "api/Product/1/Details"
								}],
								"actions": [{
								    "name": "query_product_by_query_skip_limit",
                                    "class": ["__query"],
									"title": "Search for products by query and do pagination using skip and limit parameters",
									"method": "GET",
									"href": "api/Product?query=Item1&skip=:skip&limit=:limit",
									"fields": [{
										"name": "query",
										"value": "Item1"
									},
									{
										"name": "skip"
									},
									{
										"name": "limit"
									}]
								},
								{
									"name": "create-product-test",
									"title": "Create new product and return created object back with database generated ID",
									"method": "POST",
									"href": "api/Product",
									"type": "application/x-www-form-urlencoded",
									"fields": [{
										"name": "Id",
										"value": "1"
									},
									{
										"name": "Name",
										"value": "Item1"
									},
									{
										"name": "Price",
										"value": "2.99"
									}]
								},
								{
									"name": "put_by_id_product",
									"title": "Modify existing product objects",
									"method": "PUT",
									"href": "api/Product/1",
									"fields": [{
										"name": "Id",
										"value": "1"
									},
									{
										"name": "Name",
										"value": "Item1"
									},
									{
										"name": "Price",
										"value": "2.99"
									}]
								},
								{
									"name": "delete_by_id",
									"title": "Delete product by ID",
									"method": "DELETE",
									"href": "api/Product/1"
								}]
							});
	};

	beforeEach(function () {

	    angular.module('ngResource').
	        factory('$resource', [
	             function() {
	                 return function () {
	                     return {
	                         get : function()
	                         {
	                             return true;
	                         },
	                         query : function() {
	                             return true;
	                         },
	                         invokeAction: function() {
	                             return {
	                                 $promise : {}
	                             };
	                         }
                         };

	                 };
	        }
	        ]);

		module("hateoas");
	});

	describe("HateoasInterface object", function () {

		var HateoasInterface;

		beforeEach(inject(function (_HateoasInterface_) {
			HateoasInterface = _HateoasInterface_;
		}));

		it("should retain all original object properties other than links actions properties", function () {
			
			var response = new HateoasInterface(getMockAngularResponseData());
			var rawResponse = getMockAngularResponseData();

			expect(typeof response).toBe("object");

			for (var key in rawResponse.properties) {
			    expect(response[key]).toEqual(rawResponse.properties[key]);
            }

		});

		it("should have instance methods as action names", function () {

		    var response = new HateoasInterface(getMockAngularResponseData());

		    expect(typeof response.__query).toBe("undefined");
		    expect(typeof response.query_product_by_query_skip_limit).toBe("function");
		    expect(typeof response.create_product_test).toBe("function");
		    expect(typeof response.put_by_id_product).toBe("function");
		    expect(typeof response.delete_by_id).toBe("function");

		    var actions = response.queryActions();
		    expect(actions.query_product_by_query_skip_limit.name).toBe("query_product_by_query_skip_limit");
		    expect(actions["create-product-test"].name).toBe("create-product-test");
		    expect(actions.put_by_id_product.name).toBe("put_by_id_product");
		    expect(actions.delete_by_id.name).toBe("delete_by_id");
		});

		it("should have payload data from properties", function () {

		    var response = new HateoasInterface(getMockAngularResponseData());

		    expect(response.Id).toBe(1);
		    expect(response.Name).toBe("Item1");
		    expect(response.Price).toBe(2.99);

	    });

		it("should provide a resource for each link rel", function () {

			var response = new HateoasInterface(getMockAngularResponseData());

			expect(response.self).toBeTruthy();

			expect(response.parent).toBeTruthy();

			expect(response.get_product_by_name).toBeTruthy();
			
			expect(response.by_name).toBeTruthy();
			
			expect(response.get_productdetails_by_id).toBeTruthy();

		});

		it("should recursively process an array response", function () {
			
			var response = new HateoasInterface([getMockAngularResponseData(), getMockAngularResponseData()]);

			expect(response.length).toBe(2);

			expect(response[0] instanceof HateoasInterface).toBe(true);
			expect(response[1] instanceof HateoasInterface).toBe(true);

		});
	});

	describe("transformAllResponses method", function () {

		var $httpProvider,
			HateoasInterceptorProvider,
			HateoasInterface,
			HateoasInterceptor;

		beforeEach(function () {

			// get providers
			module("ng", function (_HateoasInterceptorProvider_, _$httpProvider_) {
				HateoasInterceptorProvider = _HateoasInterceptorProvider_;
				$httpProvider = _$httpProvider_;
				$httpProvider.interceptors = [];
			});

			// get injectables
			inject(function (_HateoasInterface_, _HateoasInterceptor_) {
				HateoasInterface = _HateoasInterface_;
				HateoasInterceptor = _HateoasInterceptor_;
			});

		});

		it("should add a global HTTP interceptor", function () {
			var interceptorCount = $httpProvider.interceptors.length;
			HateoasInterceptorProvider.transformAllResponses();
			expect($httpProvider.interceptors.length).toBe(interceptorCount + 1);
		});

		describe("response interceptor", function () {

			it("should transform a HATEOAS response into a HateoasInterface", function () {
				var transformedResponse = HateoasInterceptor.response({ data: getMockAngularResponseData() }).data;

				//expect(transformedResponse).toEqual(new HateoasInterface(getMockAngularResponseData()));
			});

			it("should not change a non-HATEOAS response", function () {
				var nonHateoasResponse = { value1: "value1", value2: 2 };
				var transformedResponse = HateoasInterceptor.response(nonHateoasResponse);
				expect(transformedResponse).toEqual(nonHateoasResponse);
			});

		});
        
	    it("should provide Links metadata information according SIREN specification", function() {
	        var response = new HateoasInterface(getMockAngularResponseData());

	        var metadata;
	        metadata = response.queryLinks();
	        expect(metadata.self.href).toBe("api/Product/1");
	        expect(metadata.self.isQuery).toBe(false);

	        expect(metadata.parent.href).toBe("api/Product");
	        expect(metadata.parent.isQuery).toBe(true);

	        expect(metadata.get_product_by_name.href).toBe("api/Product/Item1");
	        expect(metadata.get_product_by_name.isQuery).toBe(false);

	        expect(metadata.by_name.href).toBe("api/Product/Item1");
	        expect(metadata.by_name.isQuery).toBe(false);
	    });

	    it("should provide Actions metadata information according SIREN specification", function() {
	        //https://github.com/kevinswiber/siren
	        var response = new HateoasInterface(getMockAngularResponseData());

	        var metadata;
	        metadata = response.queryActions()["query_product_by_query_skip_limit"];

	        expect(metadata.name).toBe("query_product_by_query_skip_limit");
	        expect(angular.isArray(metadata.class)).toBe(true);
	        expect(metadata.class.length).toBe(1);
	        expect(metadata.class[0]).toBe("__query");
	        expect(metadata.method).toBe("GET");
	        expect(metadata.href).toBe("api/Product?query=Item1&skip=:skip&limit=:limit");
	        expect(metadata.title).toBe("Search for products by query and do pagination using skip and limit parameters");
	        expect(metadata.type).toBe("application/x-www-form-urlencoded");
	        expect(metadata.fields.length).toBe(3);
	        expect(metadata.fields[0].name).toBe("query");
	        expect(metadata.fields[0].value).toBe("Item1");
	        expect(metadata.fields[0].type).toBe("text");
	        expect(metadata.fields[1].name).toBe("skip");
	        expect(metadata.fields[1].value).toBe("");
	        expect(metadata.fields[1].type).toBe("text");
	        expect(metadata.fields[2].name).toBe("limit");
	        expect(metadata.fields[2].value).toBe("");
	        expect(metadata.fields[2].type).toBe("text");

	        metadata = response.queryActions()["create-product-test"];
	        expect(typeof metadata).toBe("object");
	        expect(metadata.name).toBe("create-product-test");
	        expect(angular.isArray(metadata.class)).toBe(true);
	        expect(metadata.class.length).toBe(0);
	        expect(metadata.method).toBe("POST");
	        expect(metadata.href).toBe("api/Product");
	        expect(metadata.title).toBe("Create new product and return created object back with database generated ID");
	        expect(metadata.type).toBe("application/x-www-form-urlencoded");
	        expect(metadata.fields.length).toBe(3);
	        expect(metadata.fields[0].name).toBe("Id");
	        expect(metadata.fields[0].value).toBe("1");
	        expect(metadata.fields[0].type).toBe("text");
	        expect(metadata.fields[1].name).toBe("Name");
	        expect(metadata.fields[1].value).toBe("Item1");
	        expect(metadata.fields[1].type).toBe("text");
	        expect(metadata.fields[2].name).toBe("Price");
	        expect(metadata.fields[2].value).toBe("2.99");
	        expect(metadata.fields[2].type).toBe("text");
	    });

	    it("should metadata information according SIREN specification", function () {

	        var response = new HateoasInterface(getMockAngularResponseData());
	        try {
	            response.query_product_by_query_skip_limit({ fakeParam: 1 });
	            expect("fake parameter should throw exceprion").toBe("exception");
	        } catch (e) {
	            expect(e).toBe("Parameter query does not exists in input object");
	        }

	        try {
	            response.query_product_by_query_skip_limit({ query: "q", skip: "1", limit: 0 });
	            expect(true).toBe(true);
	        } catch (e) {
	            expect("All params specified, no exception should occur, but").toBe(e);
	        }


	    });
	    it("conflicting property should throw", function() {

	        var mock = getMockAngularResponseData();
	        mock.properties.queryActions = "queryActions";

	        try {
	            new HateoasInterface(mock);
	            expect("properties.links should throw exception").toBe("exception");
	        } catch (e) {
	            expect(e).toBe("Response properties object contains conflicting item 'queryActions'");
	        }
	    });
	});

});