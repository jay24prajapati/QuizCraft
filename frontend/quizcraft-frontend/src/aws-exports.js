const awsmobile = {
  aws_project_region: "us-east-1",
  aws_cognito_region: "us-east-1",
  aws_user_pools_id: "us-east-1_CVOHWq3XL",
  aws_user_pools_web_client_id: "5rkuvro1aifb9ld5thc8l8ui4i",
  oauth: {},
  aws_cognito_username_attributes: ["EMAIL"],
  aws_cognito_signup_attributes: ["EMAIL"],
  aws_cognito_mfa_configuration: "OFF",
  aws_cognito_password_protection_settings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: [],
  },
  aws_cognito_verification_mechanisms: ["EMAIL"],
  API: {
    endpoints: [
      {
        name: "quizcraft_api",
        endpoint: "https://gm0xy7jbe8.execute-api.us-east-1.amazonaws.com/prod",
        region: "us-east-1",
        authenticationType: "AMAZON_COGNITO_USER_POOLS", 
      },
    ],
  },
  API_ENDPOINT: "https://gm0xy7jbe8.execute-api.us-east-1.amazonaws.com/prod",
}

export default awsmobile
