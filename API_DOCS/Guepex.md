Introduction
The yalidine API is organized around REST. Our API has predictable resource-oriented URLs, accepts form-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes, authentication, and verbs.
BASE URL
https://api.yalidine.app/v1/
Authentication
The yalidine API uses API keys to authenticate requests. You can view and manage your credential and view your realtime use of quotas in your Developer Dashboard
Generate your credentials
To use The yalidine API you need to generate your API ID and API TOKEN .
The information given to you when you generate the API ID and the API TOKEN must be safeguarded like any sensitive credentials. At no time should it be shared or exposed in front-end JavaScript, for example.
Create your basic header
The yalidine API is a REST-based service. Subsequently, all requests to the API require these HTTP headers:
X-API-IDX-API-TOKEN
Example
X-API-ID: 94986571734304520846X-API-TOKEN: 5MKfvcyQtO3eouL6tDv0VDFhUT8Sc7w5
Test your API key header
This is all you need, and you can start building your application. But before you do, run a quick test to make sure it is working. Simply replace YOUR API ID and YOUR API TOKEN with the credentials you generated, and when you run this command, you should get back JSON results of the wilayas list, proving that it works.
Getting wilayas list query Curl
curl "https://api.yalidine.app/v1/wilayas/" -H "X-API-ID: YOUR API ID" -H "X-API-TOKEN: YOUR API TOKEN"
IMPORTANTPlease note that all the queries are logged. If you misuse the api, your lose the access to the api permanently and your account will be banned.
Rate limits
A rate limit is the number of API calls your app can make within a given time period; (per second, minute, hour and per day).
Your real time rate limit usage statistics are displayed in the Developer Dashboard .
Important to knowThe API shows you your remaining quota in the HTTP HEADER after each call.Always watch out the value returned via the HTTP HEADER, do this to know which quota has been completely consumed, to avoid making other requests until this quota is reset
Quota
HTTP HEADER variable
when it's reset
Per second
x-second-quota-left
Every new second
Per minute
x-minute-quota-left
Every new minute
Per hour
x-hour-quota-left
Every new hour
Per day
x-day-quota-left
Every midnight
Please note:
When you run over your quota many times, your access to the API will be disabled for a period of time; This Period increases every once you run over your quota.
If you are not sur which quota you have exceeded, please contact us by e-mail : developer@yalidine.com
Default rate limits
Type of rate limit
Default Quota
per second
5 requests
per minute
50 requests
per hour
1000 requests
per day
10000 requests
When these rate limits are exceeded your request will fail and a 429 'Too many requests' error is returned. You’ll need to wait till the next time interval (please examine the HTTP headers; they indicate when the limit resets.)
Pagination
The yalidine API pagination accepts PAGE (offset) and PAGE_SIZE (limit) query parameters, which are both optional.
Default values
For most endpoints, the PAGE_SIZE can be:
a maximum of 1,000 results
a minimum of 1
the default is 100
Parameters
Parameter
Type
Description
page
optional
The number of the page you would request
page_size
optional
A limit on the number of objects to be returned, between 1 and 1000
List Response Format
Parameter
Type
Description
has_more
Boolean
Whether or not there are more elements available after this page. If false, this page comprises the end of the list.
total_data
int
The count of the total returnable objects by your query.
data
array
An array containing the actual response elements, paginated by any request or default parameters.
links
array
An array containing the these URLs elements:ParameterTypeDescriptionselfstringThe URL for accessing the current list of resultsbeforestringThe URL for accessing the previous list (if it exists)afterstringThe URL for accessing the next list (if it exists)
Response Format
{
    "has_more": true,
    "total_data": 48,
    "data": [
        {
            "id": 4,
            "name": "Oum El Bouaghi",
            "zone": 2,
            "is_deliverable": 1
        },
        {
            "id": 5,
            "name": "Batna",
            "zone": 2,
            "is_deliverable": 1
        },
        {
            "id": 6,
            "name": "Béjaïa",
            "zone": 2,
            "is_deliverable": 1
        }
    ],
    "links": {
        "self": "https://api.yalidine.app/v1/wilayas/?page_size=3&page=2",
        "before": "https://api.yalidine.app/v1/wilayas/?page_size=3&page=1",
        "next": "https://api.yalidine.app/v1/wilayas/?page_size=3&page=3"
    }
}
Parcels
This endpoint represents your parcels, you create or delete one or more parcels at a time, retrieve them with all their details or by filtering them according to your needs.
Endpoints
GET /v1/parcels
GET /v1/parcels/:tracking
POST /v1/parcels
DELETE /v1/parcels/:tracking
PATCH /v1/parcels/:tracking
Retrieve the parcels
Retrieves the details of your parcels.
GET /v1/parcelsPHP
‹?php

    $url = "https://api.yalidine.app/v1/parcels/"; // the parcel's endpoint
    $api_id = "08467949173865045243"; // your api ID
    $api_token = "6tDv0VDFh5MKfvcyQtO3eouLUT8Sc7w5FngPzXRrOHPyq29zWY4Jlpr2dB1jaiRJ"; // your api token

    $curl = curl_init();

    curl_setopt_array($curl, array(
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'GET',
        CURLOPT_HTTPHEADER => array(
            'X-API-ID: '. $api_id,
            'X-API-TOKEN: '. $api_token
        ),
    ));

    $response_json = curl_exec($curl);
    curl_close($curl);

    $response_array = json_decode($response_json,true); // converting the json to a php array

    /* now handle the response_array like you need

        ...

    */
Response
{
        "has_more": true,
        "total_data": 7457,
        "data":[
            {
                "tracking": "yal-123456",
                "order_id": "#eadoeead",
                "firstname": "Mohamed",
                "familyname": "EL Amine",
                "contact_phone": "0123456789",
                "address": "Cité Kaidi",
                "is_stopdesk": 1,
                "stopdesk_id": 163001,
                "stopdesk_name": "Centre de Bordj El Kiffan",
                "from_wilaya_id": 5,
                "from_wilaya_name": "Batna",
                "to_commune_id": 1630,
                "to_commune_name": "Bordj El Kiffan",
                "to_wilaya_id": 16,
                "to_wilaya_name": "Alger",
                "product_list": "Machine à café",
                "price": 2400,
                "do_insurance" : true,
                "declared_value" : 5000,
                "delivery_fee": 500,
                "freeshipping": 0,
                "import_id": 233,
                "date_creation": "2020-03-25 18:44:22",
                "date_expedition": null,
                "date_last_status": "2020-03-25 18:44:22",
                "last_status": "Centre",
                "taxe_percentage": 1.5,
                "taxe_from": 10000,
                "taxe_retour": 300,
                "parcel_type": "ecommerce",
                "parcel_sub_type": null,
                "has_receipt": null,
                "length": null,
                "width": null,
                "height": null,
                "weight": null,
                "has_recouvrement": 1,
                "current_center_id": 190201,
                "current_center_name": "Centre de Aïn Arnat",
                "current_wilaya_id": 19,
                "current_wilaya_name": "Sétif",
                "current_commune_id": 1902,
                "current_commune_name": "Aïn Arnat",
                "payment_status": "not-ready",
                "payment_id": null,
                "has_exchange": 0,
                "product_to_collect": null,
                "label": "https://yalidine.app/app/bordereau.php?tracking=yal-64BPEK&token=dFNOSDlLazJQYWY1eDlhN01EbFRJQT09",
                "pin": "1572",
                "qr_text": "16,yal-123456,1630,Store Name,6548,16,"
            },
            {
                ...
            }
        ],
        "links": {
            "self": "https://api.yalidine.app/v1/parcels/",
            "next": "https://api.yalidine.app/v1/parcels/?page=2"
        }
    }
You can access a specific parcel by supplying its tracking in the path or using the tracking parameter to retrieve many parcels at one request.
Example suplying a tracking in the path
GET /v1/parcels/yal-123456
Example using the tracking parameter
GET /v1/parcels/?tracking=yal-123456,yal-789123,yal-456789
Filters
You can filter your query using one or many parameters
Example
To get only the parcels that has freeshipping delivery use the following
GET /v1/parcels/?freeshipping=true
You can filter your request deeper by using more than one filter; for example to get the parcels that has a freeshipping but only for the destination of Algiers use that:
GET /v1/parcels/?freeshipping=true&to_wilaya_id=16
You can also assign many values to the same filter; you have only to separate the values by a comma
For example: to get the parcels of two specific last status: Expédié, Livré; use the following:
GET /v1/parcels/?last_status=Expédié,Livré
ImportantIn the same filter, you can use many values separated by a comma. Except for the dates filters
Parameter
Type
Description
tracking
string
The unique identifier for the parcel.
order_id
string
The receiver’s order id
import_id
integer
The id of the operation of bulk-creation of the parcel (through importation or API creation)
to_wilaya_id
integer
The receiver’s wilaya id.
to_commune_name
string
The receiver’s commune name.
is_stopdesk
boolean
Whether the delivery is done in a stop-desk or home delivery.True means delivery in stop deskFalse means home delivery
is_exchange
boolean
Whether or not the package is the annexed parcel for an exchange request.
has_exchange
boolean
Whether or not you want to make an exchange request for this parcel.
freeshipping
boolean
Whether the delivery fee is free (paid by the sender).
date_creation
string
The parcel’s date of creation in the format YYYY-MM-DDThere are two possible way to use this filter:• Only one date:Provide only one date in the value to get all the results of this specific date.date_creation=2020-06-01• Between two datesProvide two dates in the value separated by a comma to get the result between the first and the second datedate_creation=2020-06-01,2020-07-01
date_last_status
string
The parcel’s date of the last status in the format YYYY-MM-DDThere are two possible way to use this filter:• Only one date:Provide only one date in the value to get all the results of this specific date.date_last_status=2020-06-01• Between two datesProvide two dates in the value separated by a comma to get the result between the first and the second datedate_last_status=2020-06-01,2020-07-01
payment_status
string
The current payment status of the parcel.It can be one of the following:• not-ready• ready• receivable• payed
last_status
string
The current status of the parcel's delivery.This status can be one of the following:• Pas encore expédié• A vérifier• En préparation• Pas encore ramassé• Prêt à expédier• Ramassé• Bloqué• Débloqué• Transfert• Expédié• Centre• En localisation• Vers Wilaya• Reçu à Wilaya• En attente du client• Sorti en livraison• En attente• En alerte• Tentative échouée• Livré• Echèc livraison• Retour vers centre• Retourné au centre• Retour transfert• Retour groupé• Retour à retirer• Retour vers vendeur• Retourné au vendeur• Echange échouéTo get all the details of the parcels status, see the histories docs
fields
string
You can specify which fields you want returned by using the field parameter and listing each field separated by a comma (see fileds section below)
page
integer
the number of the page you would request
page_size
integer
the number of result in the same page
order_by
string
By default, the results in the parcels response are ordered by the date_creation in a descending way.You can override the default by using the parameter orderd_by and passing one of the following values: • date_creation • date_last_status • tracking • order_id • import_id • to_wilaya_id • to_commune_id • last_status
desc
Null
(doesn't need any value) Order the result descening
asc
Null
(doesn't need any value) Order the result ascending
Fields
The response returns a set of fields by default. However, you can specify which fields you want returned by using the field parameter and listing each field separated by a comma. This overrides the defaults and returns only the fields you specify.
Example, to get only the fields of to_wilaya_name and the tracking, use the following:
GET /v1/parcels/?fields=to_wilaya_name,tracking
Field
Type
Description
Tracking
string
The unique identifier for the parcel.In some cases, the field "tracking" is always present the result, even if you don't ask for it
order_id
string
The receiver’s order id
Firstname
String
The receiver’s first name.
familyname
string
The receiver’s family name.
contact_phone
string
The receiver’s phone numbers.
Address
string
The receiver’s address.
is_stopdesk
boolean
Whether the delivery is done in a stop-desk or home delivery.• True means delivery in stop desk• False means home delivery
stopdesk_id
integer
If is_stopdesk is true, This value is the center's id of the stop-desk where you want to send the parcel to.
from_wilaya_id
integer
The sender’s wilaya id.
from_wilaya_name
string
The sender’s wilaya name.
to_commune_id
integer
The receiver’s commune id.
to_commune_name
string
The receiver’s commune name.
to_wilaya_id
integer
The receiver’s wilaya id.
to_wilaya_name
string
The receiver’s wilaya name.
product_list
string
The description of the parcel’s content.
Price
integer
The price of the parcel’s content. (equal or between 0 and 150000)
do_insurance
boolean
Whether or not the parcel has an insurance.
declared_value
integer
Represents the financial estimation of the items within the parcel.
delivery_fee
integer
The delivery fee of the parcel.
freeshipping
boolean
Whether the delivery fee is free (paid by the sender).
import_id
integer
The id of the operation of bulk-creation of the parcel (through importation or API creation)
date_creation
string
The parcel’s date of creation in the format YYYY-MM-DD HH:MM:SS
date_expedition
string
The parcel’s date of expedition in the format YYYY-MM-DD HH:MM:SS
date_last_status
string
The parcel’s date of the last status in the format YYYY-MM-DD HH:MM:SS
last_status
string
The current status of the parcel's delivery.This status can be one of the following:• Pas encore expédié• A vérifier• En préparation• Pas encore ramassé• Prêt à expédier• Ramassé• Bloqué• Débloqué• Transfert• Expédié• Centre• En localisation• Vers Wilaya• Reçu à Wilaya• En attente du client• Sorti en livraison• En attente• En alerte• Tentative échouée• Livré• Echèc livraison• Retour vers centre• Retourné au centre• Retour transfert• Retour groupé• Retour à retirer• Retour vers vendeur• Retourné au vendeur• Echange échouéTo get all the details of the parcels status, see the histories docs
taxe_percentage
float
This percentage represents the fee of cash on delivery operationThe fee can be calculated as follows :COD fees = (tax_percentage * price) / 100
taxe_from
integer
The value of price from which the taxe_percentage fee is applicable.In clear, if price is greater than or equal to taxe_from, the taxe_percentage is applicable
taxe_retour
integer
This is the value of the Return fees of the parcel
parcel_type
string
The type of the parcel, it can be one of the following• classic• ecommerce• multiseller
parcel_sub_type
string
The sub type of the parcel, it can be one of the following• accuse• exchange• rcc• rccback• sm
has_receipt
boolean
Whether the parcel has an acknowledgment of receipt or not.
Length
integer
The parcel length
Width
integer
The parcel width
Height
integer
The parcel height
Weight
integer
The parcel weight
has_recouvrement
boolean
Whether or not the parcel has a cash on delivery
current_center_id
integer
The id of the center in which the parcel is currently located.
current_center_name
string
The name of the center in which the parcel is currently located.
current_wilaya_id
integer
The id of the wilaya in which the parcel is currently located.
current_wilaya_name
string
The name of the wilaya in which the parcel is currently located.
current_commune_id
integer
The id of the commune in which the parcel is currently located.
current_commune_name
string
The name of the commune in which the parcel is currently located.
payment_status
string
The current payment status of the parcel.It can be one of the following:• not-ready• ready• receivable• payed
payment_id
string
the payment manifest id to which the package belongs
has_exchange
boolean
Whether or not the package has an annexed parcel for an exchange request.
product_to_collect
string
When has_exchange is true, this value is the designation of what to return in the annexed exchange parcel.
label
string
The link of the current parcel label. This link is publicly accessible. Anyone with this link can see the label, even without logging in
labels
string
The link of all the labels of the created parcels through this request. This link is publicly accessible. Anyone with this link can see the labels, even without logging in
qr_text
string
The text value of the QR_CODE present in the label
pin
string
The pin value of the parcel present in the label
Order
By default, the results in the parcels response are ordered by the date_creation in a descending way.
You can override the default by using the parameter orderd_by and passing one of the following values:
date_creation
date_last_status
tracking
order_id
import_id
to_wilaya_id
to_commune_id
last_status
Example, ordering by date_last_status:
GET /v1/parcels/?order_by=date_last_status
You can specify the order method by using the parameter DESC or ASC in your query, without any value
Example, ordering in an ascending way by date_last_status:
GET /v1/parcels/?order_by=date_last_status&asc
Edit the parcels
Editing a parcel is only possible if it last status is en préparation.
You must specifiy the parcel to edit in the url, in a PATCH request
PATCH /v1/parcels/yal-123456
To edit the specified parcels you can pass one or multiple parameters and their new values. Any none provided parameters will be left unchanged.
For example, if you pass the is_stopdesk parameter with the value true, you are changing the delivery type of the parcel to the stop desk delivery. All other parameters remain unchanged.
As said before, you can provide many parameters in one request. all none provided parameters won't be changed.
PATCH /v1/parcels/:trackingPHP
‹?php

    $url = "https://api.yalidine.app/v1/parcels/"; // the parcel's edition endpoint
    $api_id = "08467949173865045243"; // your api ID
    $api_token = "6tDv0VDFh5MKfvcyQtO3eouLUT8Sc7w5FngPzXRrOHPyq29zWY4Jlpr2dB1jaiRJ"; // your api token

    // you must provide the tracking in the end of the url
    $tracking = "yal-123456"; // parcel to edit
    $url .= $tracking; // adding the $tracking to the url

    $data = array ( // array of parameters to edit and their new values
        // Example : changing the firstname and the freeshipping
        "firstname"=>"Mustapha",
        "freeshipping"=> true
    );

    $postdata = json_encode($data);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH'); // we use the patch method
    // curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postdata);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            "X-API-ID: ". $api_id,
            "X-API-TOKEN: ". $api_token,
            "Content-Type: application/json"
        )
    );

    $result = curl_exec($ch);
    curl_close($ch);

    header("Content-Type: application/json");
    echo $result;
Parameters
Parameter
Required
Type
Description
order_id
No
string
A string representing the order id of the parcel.
firstname
No
string
The receiver’s first name.
familyname
No
string
The receiver’s family name
contact_phone
No
string
The receiver’s phone numbers (can be separated by commas if many)
address
No
string
The receiver’s address
from_wilaya_name
No
string
A string representing the senders’s wilaya name.You can get the list of the acceptable wilaya names in the WILAYAS endpoint. Please see the wilayas docs.
to_commune_name
Conditional
string
A string representing the receiver’s commune name.This parameter is required when you provide the parameter to_wilaya_commune.You can get the list of the acceptable commune names in the COMMUNES endpoint. Please see the communes docs.
to_wilaya_name
No
string
A string representing the receiver’s wilaya name.When you use this parameter, the parameter to_commune_name becomes required.You can get the list of the acceptable wilaya names in the WILAYAS endpoint. Please see the wilayas docs.
product_list
No
string
The description of the shipment’s content.
Price
No
integer
An integer amount representing the price you want to recover from the receiver. (equal or between 0 and 150000)
do_insurance
No
boolean
Whether or not you opt for an insurance (if true : 0% fee of declared_value is applicable, the refund is 100%).
declared_value
No
integer
Represents the financial estimation of the items within the parcel. (must be between 0 and 150000)
Length
No
integer
An integer amount representing the length of the parcel’s content. (greater than or equal to 0)
Width
No
integer
An integer amount representing the width of the parcel’s content. (greater than or equal to 0)
Height
No
integer
An integer amount representing the height of the parcel’s content. (greater than or equal to 0)
Weight
No
integer
An integer amount representing the weight of the parcel’s content. (greater than or equal to 0)
freeshipping
No
boolean
A Boolean representing whether the delivery fee is free (paid by the sender) or not.True = paid by the sender.false = paid by the receiver.
is_stopdesk
No
boolean
Whether the delivery will be done in a stop-desk or home delivery.True = delivery in stop deskFalse = home delivery
stopdesk_id
Conditional
integer
When is_stopdesk is true, this parameter must be included, this is the center's id of the stop-desk where you want to send the parcel to.
has_exchange
No
boolean
Whether or not you want to make an exchange request for this parcel.When you set the value of this parameter to true, the parmater product_to_collect becomes required.
product_to_collect
conditional
string
This parameter is required if has_exchange is true, optional if not. When has_exchange is true, this value is the designation of what to return in the annexed exchange parcel.
Return
Returns the provided parcel object if the update succeeded. Throws an error if something is invalid.
(e.g. not specifying the product_to_collect when setting has_exchange to true).
Response (json)
{
   "tracking":"yal-123456",
   "order_id":"myOrderId",
   "firstname":"Mustapha",
   "familyname":"Mohamed",
   "contact_phone":"0123456789,",
   "from_wilaya_name": "Adrar",
   "address":"Cit\u00e9 Kaidi",
   "to_commune_name":"Bordj El Kiffan",
   "to_wilaya_name":"Alger",
   "product_list":"the product list",
   "length": 10,
   "height": 1,
   "width": 20,
   "weight": 3,
   "price":3000,
   "do_insurance": true,
   "declared_value": 10000,
   "freeshipping":true,
   "is_stopdesk":false,
   "stopdesk_id": null,
   "has_exchange":0,
   "product_to_collect":null,
   "label":"https:\/\/yalidine.app\/app\/bordereau.php?tracking=yal-123456&token=TWYzeklaa25yZ1ZXYkdYUT093UTcxK3B"
}
Create the parcels
To create a parcel you need to send an array of an array of one or many parcels.
POST /v1/parcelsPHP
‹?php

    $url = "https://api.yalidine.app/v1/parcels/"; // the parcel's creation endpoint
    $api_id = "08467949173865045243"; // your api ID
    $api_token = "6tDv0VDFh5MKfvcyQtO3eouLUT8Sc7w5FngPzXRrOHPyq29zWY4Jlpr2dB1jaiRJ"; // your api token

    $data =
        array( // the array that contains all the parcels
            array ( // first parcel
                "order_id"=>"MyFirstOrder",
                "from_wilaya_name"=>"Batna",
                "firstname"=>"Brahim",
                "familyname"=>"Mohamed",
                "contact_phone"=>"0123456789,",
                "address"=>"Cité Kaidi",
                "to_commune_name"=>"Bordj El Kiffan",
                "to_wilaya_name"=>"Alger",
                "product_list"=>"Presse à café",
                "price"=>3000,
                "do_insurance" => true,
                "declared_value" => 3500,
                "height"=> 10,
                "width" => 20,
                "length" => 30,
                "weight" => 6,
                "freeshipping"=> true,
                "is_stopdesk"=> true,
                "stopdesk_id" => 163001,
                "has_exchange"=> 0,
                "product_to_collect" => null
            ),
            array ( // second parcel
                "order_id" =>"MySecondOrder",
                "from_wilaya_name"=>"Batna",
                "firstname"=>"رفيدة",
                "familyname"=>"بن مهيدي",
                "contact_phone"=>"0123456789",
                "address"=>"حي الياسمين",
                "to_commune_name"=>"Ouled Fayet",
                "to_wilaya_name"=>"Alger",
                "product_list"=>"كتب الطبخ",
                "price"=>2400,
                "do_insurance" => false,
                "declared_value" => 3500,
                "height" => 10,
                "width" => 20,
                "length" => 30,
                "weight" => 6,
                "freeshipping"=>0,
                "is_stopdesk"=>0,
                "has_exchange"=> false,
            ),
            array ( // third parcel
                ...
            ),
            array( // etc
                ...
            )
        );

    $postdata = json_encode($data);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postdata);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            "X-API-ID: ". $api_id,
            "X-API-TOKEN: ". $api_token,
            "Content-Type: application/json"
        )
    );

    $result = curl_exec($ch);
    curl_close($ch);

    header("Content-Type: application/json");
    echo $result;
Parameters
Parameter
Required
Type
Description
order_id
required
string
A string representing the order id of the parcel, you cannot use duplicated order id in the same request, so this must be unique for each parcel in the same request.When the parcel is created, this order_id let you know which tracking is affected to which order.
from_wilaya_name
required
string
A string representing the sender’s wilaya name.You can get the list of the acceptable wilaya names in the WILAYAS endpoint. Please see the wilayas docs.
firstname
required
string
The receiver’s first name.
familyname
required
string
The receiver’s family name
contact_phone
required
string
The receiver’s phone numbers (can be separated by commas if many)
address
required
string
The receiver’s address
to_commune_name
required
string
A string representing the receiver’s commune name.You can get the list of the acceptable commune names in the COMMUNES endpoint. Please see the communes docs.
to_wilaya_name
required
string
A string representing the receiver’s wilaya name.You can get the list of the acceptable wilaya names in the WILAYAS endpoint. Please see the wilayas docs.
product_list
required
string
The description of the shipment’s content.
Price
required
integer
An integer amount representing the price you want to recover from the receiver. (equal or between 0 and 150000)
do_insurance
Required
boolean
Whether or not you opt for an insurance (if true : 0% fee of declared_value is applicable, the refund is 100%).
declared_value
Required
integer
Represents the financial estimation of the items within the parcel. (must be between 0 and 150000)
Length
Required
integer
An integer amount representing the length of the parcel’s content. (greater than or equal to 0)
Width
Required
integer
An integer amount representing the width of the parcel’s content. (greater than or equal to 0)
Height
Required
integer
An integer amount representing the height of the parcel’s content. (greater than or equal to 0)
Weight
Required
integer
An integer amount representing the weight of the parcel’s content. (greater than or equal to 0)
freeshipping
required
boolean
A Boolean representing whether the delivery fee is free (paid by the sender) or not.True = paid by the sender.false = paid by the receiver.
is_stopdesk
required
boolean
Whether the delivery will be done in a stop-desk or home delivery.True = delivery in stop desk, you must include the param stopdesk_id, see below.False = home delivery
stopdesk_id
conditional
string
This parameter is required if is_stopdesk is true, optional if not. This value is the center's id of the stop-desk where you want to send the parcel to.
has_exchange
required
boolean
A Boolean representing Whether or not you want to make an exchange request for this parcel.
product_to_collect
conditional
string
This parameter is required if has_exchange is true, optional if not. When has_exchange is true, this value is the designation of what to return in the annexed exchange parcel.
Return
Returns the order_id and the tracking associated with it if the creation succeeded. Throws an error if one or more parameters are invalid or missing.
When an error occurs, the query will fail and no parcels will be created
Response (json)
{
        "MyFirstOrder": {
            "success": true,
            "order_id": "MyFirstOrder",
            "tracking": "yal-12345A",
            "import_id": 234,
            "label" : "https://yalidine.app/app/bordereau.php?tracking=yal-12345A&token=eVIzd0lCdFRGdXlmbkcwK1JBOWlHUT09",
            "labels" : "https://yalidine.app/app/bordereau.php?import_id=352&si=5455878&token=SFUxek1qQVdhbXV2QjZDUXZM6548"
        },
        "MySecondOrder": {
            "success": true,
            "order_id": "MySecondOrder",
            "tracking": "yal-67891B",
            "import_id": 234,
            "label" : "https://yalidine.app/app/bordereau.php?tracking=yal-67891B&token=GdXlmbkceVIzd0lCHUT09wK1JdFRBOWl",
            "labels" : "https://yalidine.app/app/bordereau.php?import_id=352&si=5455878&token=SFUxek1qQVdhbXV2QjZDUXZM6548"
        }
    }
Delete the parcels
Deleting a parcel is only possible if it last status is en préparation.
You can delete the parcels by two method.
Method 1: making a delete request to a specific parcel object
DELETE /v1/parcels/yal-123456
Method 2: Deleting one or many at one time by using the tracking parameter
DELETE /v1/parcels/?tracking=yal-123456,yal-789102
If you choose the second method, separate the tracking values by a comma
Parameters
Parameter
Required
Type
Description
tracking
string
Conditional
optional if you use Method 1.Required if you use Method 2.A string representing one or multiple parcels to delete (separated by commas).
Returns
This return the decision of deletion of each tracking or an error.
Response
{
        {
            "tracking": "yal-12345A",
            "deleted": true // Deleted successfully
        },
        {
            "tracking": "yal-12345A",
            "deleted": false /* Deletion Impossible for one of the following reasons:
                                cannot be deleted or
                                misspelled or
                                does not exist or
                                already deleted before
                             */
        },
    }
Histories
Retrieves the details of the parcels status. you retrieve your parcels status with all their details or by filtering them according to your needs.
Endpoints
GET /v1/histories
GET /v1/histories/:tracking
Retrieve the Histories
Retrieves the details of your Histories.
GET /v1/historiesPHP
‹?php

$url = "https://api.yalidine.app/v1/histories/"; // the histories endpoint
$api_id = "08467949173865045243"; // your api ID
$api_token = "6tDv0VDFh5MKfvcyQtO3eouLUT8Sc7w5FngPzXRrOHPyq29zWY4Jlpr2dB1jaiRJ"; // your api token

$curl = curl_init();

curl_setopt_array($curl, array(
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_MAXREDIRS => 10,
    CURLOPT_TIMEOUT => 0,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CUSTOMREQUEST => 'GET',
    CURLOPT_HTTPHEADER => array(
        'X-API-ID: '. $api_id,
        'X-API-TOKEN: '. $api_token
    ),
));

$response_json = curl_exec($curl);
curl_close($curl);

$response_array = json_decode($response_json,true); // converting the json to a php array

/* now handle the response_array like you need

    ...

*/
Response
{
    "has_more": true,
    "total_data": 65465,
    "data":[
        {
            "date_status": "2022-12-17 01:48:09",
            "tracking": "yal-337AAS",
            "status": "Sorti en livraison",
            "reason": "",
            "center_id": 120201,
            "center_name": "Centre de Bir el Ater",
            "wilaya_id": 12,
            "wilaya_name": "Tébessa",
            "commune_id": 1202,
            "commune_name": "Bir el Ater"
        },
        {
            ...
        }
    ],
    "links": {
        "self": "https://api.yalidine.app/v1/histories/",
        "next": "https://api.yalidine.app/v1/histories/?page=2"
    }
}
You can access all the status of a specific parcel by supplying its tracking in the path or using the tracking parameter to retrieve many at the same request.
Example suplying a tracking in the path
GET /v1/histories/yal-123456
Example using the tracking parameter
GET /v1/histories/?tracking=yal-123456,yal-789123,yal-456789
Filters
You can filter your query using one or many parameters
Example
To get only the status of delivered parcels using the status paramater:
GET /v1/histories/?status=Livré
You can filter your request deeper by using more than one filter; for example the details of a delivered parcel use that:
GET /v1/histories/?status=Livré&tracking=yal-123456
You can also assign many values to the same filter; you have only to separate the values by a comma
For example: To get the details of the status of delivery of two parcels use the following:
GET /v1/histories/?status=Livré&tracking=yal-123456,yal-789123
ImportantIn the same filter, you can use many values separated by a comma. Except for the dates filters
Parameter	Type	Description
Tracking	string	The identifier of the parcels.
Status	string	The status of the parcelThis status can be one of the following:• Pas encore expédié• A vérifier• En préparation• Pas encore ramassé• Prêt à expédier• Ramassé• Bloqué• Débloqué• Transfert• Expédié• Centre• En localisation• Vers Wilaya• Reçu à Wilaya• En attente du client• Sorti en livraison• En attente• En alerte• Alerte résolue• Tentative échouée• Livré• Echèc livraison• Retour vers centre• Retourné au centre• Retour transfert• Retour groupé• Retour à retirer• Retour vers vendeur• Retourné au vendeur• Echange échoué
date_status	string	The status’s date of creation in the format YYYY-MM-DD.There are two possible way to use this filter.Only one date:Provide only one date in the value to get all the results of this specific date.date_status=2020-06-01Between two datesProvide two dates in the value separated by a comma to get the result between the first and the second datedate_status=2020-06-01,2020-07-01
Reason	string	The reason of a failed delivery attempt or a parcel holdFor the failed delivery :• Téléphone injoignable• Client ne répond pas• Faux numéro• Client absent (reporté)• Client absent (échoué)• Annulé par le client• Commande double• Le client n'a pas commandé• Produit erroné• Produit manquant• Produit cassé ou défectueux• Client incapable de payer• Wilaya erronée• Commune erronée• Client no-showFor the parcel hold:• Document manquant• Produit interdit• Produit dangereux• Fausse déclaration
Fields	string	You can specify which fields you want returned by using the field parameter and listing each field separated by a comma (see fields section below)
Page	integer	the number of the page you would request
page_size	integer	the number of result in the same page
order_by	string	By default, the results in the histories response are ordered by the date_status in a descending way.You can override the default by using the parameter orderd_by and passing one of the following values:• date_status• tracking• status• reason
desc	Null	(doesn't need any value) Order the result descening
asc	Null	(doesn't need any value) Order the result ascending

### **Order**

By default, the results in the histories response are ordered by the date_status in a descending way.

You can override the default by using the parameter orderd_by and passing one of the following values:

- date_status
- tracking
- status
- reason

Example, ordering by tracking:

`GET /v1/histories/?order_by=tracking`