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
									"rel": ["parent"],
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
                                    "class": ["query"],
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
									"name": "create-product",
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
	                         },
	                         $invokeAction: function() {
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

		it("should retain all original object properties other than links", function () {
			
			var response = new HateoasInterface(getMockAngularResponseData());
			var rawResponse = getMockAngularResponseData();

			expect(typeof response).toBe("object");

			for (var key in rawResponse) {
				if (key !== "links") expect(response[key]).toEqual(rawResponse[key]);
			}

		});

		it("should have instance methods as action names", function () {

		    var response = new HateoasInterface(getMockAngularResponseData());

		    expect(typeof response.query_product_by_query_skip_limit).toBe("function");
		    expect(typeof response.create_product).toBe("function");
		    expect(typeof response.put_by_id_product).toBe("function");
		    expect(typeof response.delete_by_id).toBe("function");

		    expect(typeof response.query_product_by_query_skip_limit.metadata).toBe("function");
		    expect(typeof response.create_product.metadata).toBe("function");
		    expect(typeof response.put_by_id_product.metadata).toBe("function");
		    expect(typeof response.delete_by_id.metadata).toBe("function");
		});

		it("should have payload data from properties", function () {

		    var response = new HateoasInterface(getMockAngularResponseData());

		    expect(response.properties.Id).toBe(1);
		    expect(response.properties.Name).toBe("Item1");
		    expect(response.properties.Price).toBe(2.99);

	    });

		it("should provide a resource for each link rel", function () {

			var response = new HateoasInterface(getMockAngularResponseData());

			expect(typeof response.resource).toBe("function");

			expect(response.resource("self")).toBeTruthy();
			expect(typeof response.resource("self").get).toBe("function");

			expect(response.resource("parent")).toBeTruthy();
			expect(typeof response.resource("parent").get).toBe("function");

			expect(response.resource("get_product_by_name")).toBeTruthy();
			expect(typeof response.resource("get_product_by_name").get).toBe("function");
			
			expect(response.resource("by_name")).toBeTruthy();
			expect(typeof response.resource("by_name").get).toBe("function");
			
			expect(response.resource("get_productdetails_by_id")).toBeTruthy();
			expect(typeof response.resource("get_productdetails_by_id").get).toBe("function");

			

			expect(response.resource).toThrow();
			expect(function () {
				response.resource("invalid link");
			}).toThrow();

		});

		it("should recursively process an array response", function () {
			
			var response = new HateoasInterface([getMockAngularResponseData(), getMockAngularResponseData()]);

			expect(response.length).toBe(2);

			expect(response[0] instanceof HateoasInterface).toBe(true);
			expect(response[1] instanceof HateoasInterface).toBe(true);

		});

		it("should recursively process nested objects", function () {

			var response = new HateoasInterface({
				nestedObj1: getMockAngularResponseData(),
				nestedObj2: getMockAngularResponseData()
			});

			expect(response.nestedObj1 instanceof HateoasInterface).toBe(true);
			expect(response.nestedObj2 instanceof HateoasInterface).toBe(true);

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
        
	    it("should metadata information according SIREN specification", function() {
	        //https://github.com/kevinswiber/siren
	        var response = new HateoasInterface(getMockAngularResponseData());

	        var metadata;
	        metadata = response.query_product_by_query_skip_limit.metadata();

	        expect(typeof metadata).toBe("object");
	        expect(metadata.name).toBe("query_product_by_query_skip_limit");
	        expect(angular.isArray(metadata.class)).toBe(true);
	        expect(metadata.class.length).toBe(1);
	        expect(metadata.class[0]).toBe("query");
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
	        metadata = response.create_product.metadata();
	        expect(typeof metadata).toBe("object");
	        expect(metadata.name).toBe("create-product");
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

	});

});