Webhooks
This endpoint allows you to create a new webhook that listens for specific events.

Here are the available event types you can subscribe to:

Event Type	Description
OrderCreated	Triggered when a new order is created
OrderDeleted	Triggered when an order is deleted
OrderStatusChanged	Triggered when an order status is changed
OrderConfirmationStatusChanged	Triggered when an order confirmation status is changed
OrderShippingStatusChanged	Triggered when an order shipping status is changed
When the event is triggered, your webhook will receive an HTTP POST request containing the event data, formatted exactly like the response from the Retreive a single order endpoint.

The request will include several headers:

X-Ecomanager-Signature: A security signature generated using HMAC SHA256 and the full raw request payload, you should use it to verify that the request really comes from ECOMANAGER and was not modified during transmission.
X-Ecomanager-Source: The full url of your ECOMANAGER account.
X-Ecomanager-Event: The type of event that triggered the webhook.
X-Ecomanager-Webhook-ID: The ID of the webhook that was triggered.
Activation:
After you create or activate a webhook, we will send an initial HTTP GET request to your delivery URL to validate that it is reachable, If the validation request succeeds, the webhook will be successfully activated.

Retry Policy:
Your server must respond with a 200 OK status within 5 seconds. Otherwise, the delivery attempt will be considered failed and retried up to 6 times, with exponentially increasing intervals between each attempt.

The final retry may occur approximately 24 hours after the initial attempt.

If all retries fail, the webhook will be automatically disabled, and you will be notified by email.

Create a webhook
requires authentication

Example request:
$client = new \GuzzleHttp\Client();
$url = 'https://natureldz.ecomanager.dz/api/shop/v2/webhooks';
$response = $client->post(
    $url,
    [
        'headers' => [
            'Authorization' => 'Bearer {YOUR_SHOP_API_TOKEN}',
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ],
        'json' => [
            'name' => 'Order Created Webhook',
            'event' => 'OrderCreated',
            'http_method' => 'post',
            'delivery_url' => 'https://example.com/webhook',
            'headers' => [
                [
                    'key' => 'MyCustomKey',
                    'value' => 'MyCustomValue',
                ],
            ],
            'payload' => [
                [
                    'key' => 'MyCustomKey',
                    'value' => 'MyCustomValue',
                ],
            ],
            'secret' => 'supersecretkey',
            'is_active' => true,
        ],
    ]
);
$body = $response->getBody();
print_r(json_decode((string) $body));
Example response (200):


{
    "id": 1,
    "name": "Order Created Webhook",
    "event": "OrderCreated",
    "http_method": "post",
    "delivery_url": "https://example.com/webhook",
    "headers": [
        {
            "MyCustomKey": "MyCustomValue"
        }
    ],
    "payload": [
        {
            "MyCustomKey": "MyCustomValue"
        }
    ],
    "secret": "supersecretkey",
    "is_active": 1,
    "created_at": "2025-04-26 14:30:00",
    "updated_at": "2025-04-26 14:30:00"
}

 
Request   
POST api/shop/v2/webhooks

Headers
Authorization      
Example: Bearer {YOUR_SHOP_API_TOKEN}

Content-Type      
Example: application/json

Accept      
Example: application/json

Body Parameters
name   string   
The webhook name. Example: Order Created Webhook

event   string   
The event that triggers the webhook. Example: OrderCreated

http_method   string  optional  
The HTTP method used to send the webhook (post or get). Example: post

delivery_url   string   
The full HTTPS URL where the webhook will be delivered. Example: https://example.com/webhook

headers   object[]  optional  
List of headers (max 5).

payload   object[]  optional  
List of payload fields (max 10).

secret   string   
Secret key used to validate webhook signatures. Example: supersecretkey

is_active   boolean   
Whether the webhook is active (1) or inactive (0). Example: true

Retrieve a list of webhooks
requires authentication

Example request:
$client = new \GuzzleHttp\Client();
$url = 'https://natureldz.ecomanager.dz/api/shop/v2/webhooks';
$response = $client->get(
    $url,
    [
        'headers' => [
            'Authorization' => 'Bearer {YOUR_SHOP_API_TOKEN}',
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ],
        'query' => [
            'ids' => '1,2',
            'per_page' => '10',
        ],
    ]
);
$body = $response->getBody();
print_r(json_decode((string) $body));
Example response (200):


{
    "data": [
        {
            "id": 1,
            "name": "Order Created Webhook",
            "event": "OrderCreated",
            "http_method": "post",
            "delivery_url": "https://example.com/webhook",
            "headers": [
                {
                    "MyCustomKey": "MyCustomValue"
                }
            ],
            "payload": [
                {
                    "MyCustomKey": "MyCustomValue"
                }
            ],
            "secret": "supersecretkey",
            "is_active": 1,
            "created_at": "2025-04-26 14:30:00",
            "updated_at": "2025-04-26 14:30:00"
        }
    ],
    "links": {
        "first": null,
        "last": null,
        "prev": null,
        "next": "https://test.ecomanager.dz/api/shop/v2/webhooks?cursor=eyJpZCI6OTA1NDQ4LCJfcG9pbnRzVG9OZXh0SXRlbXMiOnRydWV9"
    },
    "meta": {
        "path": "https://test.ecomanager.dz/api/shop/v2/webhooks",
        "per_page": 10,
        "next_cursor": "eyJpZCI6OTA1NDQ4LCJfcG9pbnRzVG9OZXh0SXRlbXMiOnRydWV9",
        "prev_cursor": null
    }
}

 
Request   
GET api/shop/v2/webhooks

Headers
Authorization      
Example: Bearer {YOUR_SHOP_API_TOKEN}

Content-Type      
Example: application/json

Accept      
Example: application/json

Query Parameters
ids   string  optional  
Comma-separated List of webhook IDs to include in the response. Example: 1,2

per_page   integer  optional  
The number of webhooks to include per page in the response. Example: 10

Retreive a single webhook
requires authentication

Example request:
$client = new \GuzzleHttp\Client();
$url = 'https://natureldz.ecomanager.dz/api/shop/v2/webhooks/1';
$response = $client->get(
    $url,
    [
        'headers' => [
            'Authorization' => 'Bearer {YOUR_SHOP_API_TOKEN}',
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ],
    ]
);
$body = $response->getBody();
print_r(json_decode((string) $body));
Example response (200):


{
    "id": 1,
    "name": "Order Created Webhook",
    "event": "OrderCreated",
    "http_method": "post",
    "delivery_url": "https://example.com/webhook",
    "headers": [
        {
            "MyCustomKey": "MyCustomValue"
        }
    ],
    "payload": [
        {
            "MyCustomKey": "MyCustomValue"
        }
    ],
    "secret": "supersecretkey",
    "is_active": 1,
    "created_at": "2025-04-26 14:30:00",
    "updated_at": "2025-04-26 14:30:00"
}

 
Request   
GET api/shop/v2/webhooks/{id}

Headers
Authorization      
Example: Bearer {YOUR_SHOP_API_TOKEN}

Content-Type      
Example: application/json

Accept      
Example: application/json

URL Parameters
id   integer   
The webhook ID. Example: 1

Update a webhook status
requires authentication

Example request:
$client = new \GuzzleHttp\Client();
$url = 'https://natureldz.ecomanager.dz/api/shop/v2/webhooks/61/status';
$response = $client->put(
    $url,
    [
        'headers' => [
            'Authorization' => 'Bearer {YOUR_SHOP_API_TOKEN}',
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ],
        'json' => [
            'status' => true,
        ],
    ]
);
$body = $response->getBody();
print_r(json_decode((string) $body));
Example response (200):


{
    "id": 1,
    "name": "Order Created Webhook",
    "event": "OrderCreated",
    "http_method": "post",
    "delivery_url": "https://example.com/webhook",
    "headers": [
        {
            "MyCustomKey": "MyCustomValue"
        }
    ],
    "payload": [
        {
            "MyCustomKey": "MyCustomValue"
        }
    ],
    "secret": "supersecretkey",
    "is_active": 1,
    "created_at": "2025-04-26 14:30:00",
    "updated_at": "2025-04-26 14:30:00"
}

 
Request   
PUT api/shop/v2/webhooks/{id}/status

Headers
Authorization      
Example: Bearer {YOUR_SHOP_API_TOKEN}

Content-Type      
Example: application/json

Accept      
Example: application/json

URL Parameters
id   string   
The ID of the webhook. Example: 61

Body Parameters
status   boolean   
Whether the webhook is active (1) or inactive (0). Example: true

Update a webhook
requires authentication

Example request:
$client = new \GuzzleHttp\Client();
$url = 'https://natureldz.ecomanager.dz/api/shop/v2/webhooks/003';
$response = $client->put(
    $url,
    [
        'headers' => [
            'Authorization' => 'Bearer {YOUR_SHOP_API_TOKEN}',
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ],
        'json' => [
            'name' => 'Order Created Webhook',
            'event' => 'OrderCreated',
            'http_method' => 'post',
            'delivery_url' => 'https://example.com/webhook',
            'headers' => [
                [
                    'key' => 'MyCustomKey',
                    'value' => 'MyCustomValue',
                ],
            ],
            'payload' => [
                [
                    'key' => 'MyCustomKey',
                    'value' => 'MyCustomValue',
                ],
            ],
            'secret' => 'supersecretkey',
            'is_active' => true,
        ],
    ]
);
$body = $response->getBody();
print_r(json_decode((string) $body));
Example response (200):


{
    "id": 1,
    "name": "Order Created Webhook",
    "event": "OrderCreated",
    "http_method": "post",
    "delivery_url": "https://example.com/webhook",
    "headers": [
        {
            "MyCustomKey": "MyCustomValue"
        }
    ],
    "payload": [
        {
            "MyCustomKey": "MyCustomValue"
        }
    ],
    "secret": "supersecretkey",
    "is_active": 1,
    "created_at": "2025-04-26 14:30:00",
    "updated_at": "2025-04-26 14:30:00"
}

 
Request   
PUT api/shop/v2/webhooks/{id}

Headers
Authorization      
Example: Bearer {YOUR_SHOP_API_TOKEN}

Content-Type      
Example: application/json

Accept      
Example: application/json

URL Parameters
id   string   
The ID of the webhook. Example: 003

Body Parameters
name   string   
The webhook name. Example: Order Created Webhook

event   string   
The event that triggers the webhook. Example: OrderCreated

http_method   string  optional  
The HTTP method used to send the webhook (post or get). Example: post

delivery_url   string   
The full HTTPS URL where the webhook will be delivered. Example: https://example.com/webhook

headers   object[]  optional  
List of headers (max 5).

payload   object[]  optional  
List of payload fields (max 10).

secret   string  optional  
Secret key used to validate webhook signatures. Example: supersecretkey

is_active   boolean   
Whether the webhook is active (1) or inactive (0). Example: true

Delete a webhook
requires authentication

Example request:
$client = new \GuzzleHttp\Client();
$url = 'https://natureldz.ecomanager.dz/api/shop/v2/webhooks/4';
$response = $client->delete(
    $url,
    [
        'headers' => [
            'Authorization' => 'Bearer {YOUR_SHOP_API_TOKEN}',
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ],
    ]
);
$body = $response->getBody();
print_r(json_decode((string) $body));
Example response (201):


{
    "success": "Webhook deleted successfully."
}

 
Request   
DELETE api/shop/v2/webhooks/{id}

Headers
Authorization      
Example: Bearer {YOUR_SHOP_API_TOKEN}

Content-Type      
Example: application/json

Accept      
Example: application/json

URL Parameters
id   string   
The ID of the webhook. Example: 4

