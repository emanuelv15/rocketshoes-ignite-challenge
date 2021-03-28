import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const isProductOnCart = cart.find(product => product.id === productId)
      const { data: stockProduct } = await api.get(`stock/${productId}`)

      if (!isProductOnCart) {
        if (stockProduct.amount > 0) {
          const { data: product } = await api.get(`products/${productId}`)

          const productAdded = { ...product, amount: 1 }

          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, productAdded]))

          setCart([...cart, productAdded])
        }
      } else {
        if (isProductOnCart.amount < stockProduct.amount) {
          const chosenProduct = { ...isProductOnCart, amount: isProductOnCart.amount + 1 }

          const cartProductIncrement = cart.map((product) => {
            if (product.id === chosenProduct.id) {
              product = chosenProduct
            }

            return product
          })

          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cartProductIncrement]))

          setCart([...cartProductIncrement])
        } else {
          toast.error('Quantidade solicitada fora de estoque')
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductOnCart = cart.find(product => product.id === productId)

      if (isProductOnCart) {
        const cartItemRemoved = cart.filter((product) => product.id !== productId);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cartItemRemoved]));

        setCart([...cartItemRemoved]);
      } else {
        toast.error('Erro na remoção do produto');
      }

    } catch {
      // TODO
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const isProductOnCart = cart.find(product => product.id === productId)

      if (isProductOnCart) {
        const { data: stockProduct } = await api.get(`stock/${productId}`)
        
        const cartItemsAmountUpdated = cart.map((product) => {
          if (product.id === productId && amount <= stockProduct.amount && amount >= 1) {
            product.amount = amount
          } else if (product.id === productId && amount > stockProduct.amount) {
            // eslint-disable-next-line no-throw-literal
            throw 'Quantidade solicitada fora de estoque'
          } else if (product.id === productId && amount < 1) {
            // eslint-disable-next-line no-throw-literal
            throw 'Erro na alteração de quantidade do produto'
          }
  
          return product;
        })
  
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cartItemsAmountUpdated]));
  
        setCart([...cartItemsAmountUpdated]);
      } else {
        // eslint-disable-next-line no-throw-literal
        throw 'Erro na alteração de quantidade do produto'
      }

    } catch (e) {
      // TODO
      toast.error(e);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
