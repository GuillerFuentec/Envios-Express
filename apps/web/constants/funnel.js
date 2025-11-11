"use strict";

export const GLOBAL_ERROR_MESSAGE =
  "Por favor, complete los campos faltantes. Luego, en el paso 3 (‘Preferencias y verificación’), deje un comentario en ‘Comentarios adicionales’ explicando cualquier detalle.";

export const INITIAL_FORM_STATE = {
  contact: {
    name: "",
    email: "",
    phone: "",
    smsConsent: true,
  },
  shipment: {
    weightLbs: "",
    cityCuba: "",
    contentType: "",
    deliveryDate: "",
  },
  preferences: {
    pickup: false,
    pickupAddress: "",
    pickupAddressPlaceId: "",
    pickupLocation: null,
    addressCapture: null,
    additionalComments: "",
    paymentMethod: "online",
  },
};
