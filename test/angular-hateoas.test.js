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
		module("ngResource");
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
				expect(transformedResponse).toEqual(new HateoasInterface(getMockAngularResponseData()));
			});

			it("should not change a non-HATEOAS response", function () {
				var nonHateoasResponse = { value1: "value1", value2: 2 };
				var transformedResponse = HateoasInterceptor.response(nonHateoasResponse);
				expect(transformedResponse).toEqual(nonHateoasResponse);
			});

		});

	});

});